import { ref, computed } from 'vue'

const API_URL = import.meta.env.VITE_GAS_API_URL || ''

// Shared State agar sinkron antar halaman
const tickets = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const isCooldown = ref(false)
const updatingId = ref(null)
const deletingId = ref(null)
const errorMessage = ref('')
const successMessage = ref('')

const filterStatus = ref('All')
const searchQuery = ref('')

const form = ref({
  pekerjaan: '',
  orderBy: '',
  prioritas: 'Normal'
})

/**
 * Helper fetch dengan dukungan timeout dan pemeriksaan status jaringan
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Koneksi internet terputus. Pastikan perangkat Anda terhubung ke jaringan.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return res
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Waktu permintaan habis (timeout). Server Google Apps Script lambat merespons, silakan coba lagi.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export function useTickets() {
  // Cek apakah URL Apps Script sudah dikonfigurasi
  const isApiConfigured = computed(() => {
    return API_URL && API_URL.trim() !== '' && !API_URL.includes('YOUR_SCRIPT_ID')
  })

  // Ringkasan Statistik Tiket
  const stats = computed(() => {
    const total = tickets.value.length
    const open = tickets.value.filter(t => (t.status || '').toLowerCase() === 'open').length
    const inProgress = tickets.value.filter(t => (t.status || '').toLowerCase() === 'in progress').length
    const done = tickets.value.filter(t => (t.status || '').toLowerCase() === 'done').length
    return { total, open, inProgress, done }
  })

  // Filter & Pencarian Tiket (Mencari di judul pekerjaan dan Order By)
  const filteredTickets = computed(() => {
    const query = searchQuery.value.toLowerCase().trim()
    return tickets.value.filter(ticket => {
      const matchesStatus = filterStatus.value === 'All' || 
        (ticket.status || '').toLowerCase() === filterStatus.value.toLowerCase()
      
      const matchesSearch = !query || 
        (ticket.pekerjaan || '').toLowerCase().includes(query) ||
        (ticket.orderBy || '').toLowerCase().includes(query)

      return matchesStatus && matchesSearch
    })
  })

  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      successMessage.value = message
      errorMessage.value = ''
      setTimeout(() => {
        if (successMessage.value === message) {
          successMessage.value = ''
        }
      }, 4000)
    } else {
      errorMessage.value = message
      setTimeout(() => {
        if (errorMessage.value === message) {
          errorMessage.value = ''
        }
      }, 6000)
    }
  }

  // Mengambil Data Tiket dari Google Apps Script
  const fetchTickets = async () => {
    if (!isApiConfigured.value) return

    isLoading.value = true
    errorMessage.value = ''
    try {
      const res = await fetchWithTimeout(API_URL, { method: 'GET' }, 15000)
      if (!res.ok) {
        throw new Error(`Server merespons dengan status HTTP ${res.status}`)
      }

      const data = await res.json().catch(() => {
        throw new Error('Respons dari Google Sheets tidak berupa format JSON yang valid.')
      })

      if (Array.isArray(data)) {
        tickets.value = data
      } else if (data && data.error) {
        throw new Error(data.error)
      } else {
        tickets.value = []
      }
    } catch (error) {
      console.error("Gagal mengambil data tiket:", error)
      const msg = error.message || "Gagal memuat tiket dari Google Sheets. Pastikan Web App GAS telah di-deploy dengan akses 'Anyone'."
      showToast(msg, 'error')
    } finally {
      isLoading.value = false
    }
  }

  // Tambah Tiket Baru (Khusus Portal Elektromedis) dengan Pencegahan Double Submit
  const submitTicket = async () => {
    // 1. Guard anti-double submit: jika sedang proses atau dalam cooldown, tolak klik berikutnya
    if (isSubmitting.value || isCooldown.value) {
      return false
    }

    // 2. Validasi input
    if (!form.value.pekerjaan.trim()) {
      showToast("Deskripsi pekerjaan atau alat medis wajib diisi.", "error")
      return false
    }

    if (!isApiConfigured.value) {
      showToast("VITE_GAS_API_URL belum dikonfigurasi di file .env", 'error')
      return false
    }

    // 3. Kunci status submit seketika
    isSubmitting.value = true
    errorMessage.value = ''

    try {
      const res = await fetchWithTimeout(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          pekerjaan: form.value.pekerjaan.trim(),
          orderBy: form.value.orderBy.trim(),
          prioritas: form.value.prioritas || 'Normal',
          status: 'Open'
        })
      }, 15000)

      if (!res.ok) {
        throw new Error(`Gagal menyimpan data ke server (HTTP ${res.status})`)
      }

      const result = await res.json().catch(() => {
        throw new Error('Respons server tidak dapat dibaca.')
      })

      if (result && result.success === false) {
        throw new Error(result.error || 'Server menolak penyimpanan tiket.')
      }

      if (result && result.duplicate) {
        showToast("Tiket serupa baru saja ditambahkan (duplikasi diabaikan).", 'success')
      } else {
        showToast("Tiket pekerjaan elektromedis berhasil ditambahkan!", 'success')
      }

      // Reset form ke kondisi awal
      form.value.pekerjaan = ''
      form.value.orderBy = ''
      form.value.prioritas = 'Normal'
      
      await fetchTickets()
      return true
    } catch (error) {
      console.error("Gagal menyimpan data:", error)
      const msg = error.message || "Terjadi kesalahan saat menyimpan tiket. Periksa koneksi atau URL Apps Script."
      showToast(msg, 'error')
      return false
    } finally {
      isSubmitting.value = false
      // Berikan cooldown singkat 1000ms untuk mencegah accidental rapid-tap
      isCooldown.value = true
      setTimeout(() => {
        isCooldown.value = false
      }, 1000)
    }
  }

  // Set Status Langsung (Bisa Maju / Mundur dengan Update Timestamp Akurat)
  const setStatus = async (ticket, targetStatus) => {
    if (!isApiConfigured.value || updatingId.value === ticket.id) return
    if (ticket.status === targetStatus) return

    updatingId.value = ticket.id
    const prevStatus = ticket.status
    const prevInProgress = ticket.inProgressAt
    const prevDone = ticket.doneAt

    const nowIso = new Date().toISOString()

    // Optimistic UI update dengan aturan reset timestamp
    ticket.status = targetStatus
    if (targetStatus === 'Open') {
      ticket.inProgressAt = ''
      ticket.doneAt = ''
    } else if (targetStatus === 'In Progress') {
      ticket.inProgressAt = nowIso
      ticket.doneAt = ''
    } else if (targetStatus === 'Done') {
      if (!ticket.inProgressAt) {
        ticket.inProgressAt = nowIso
      }
      ticket.doneAt = nowIso
    }

    try {
      const res = await fetchWithTimeout(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_status',
          id: ticket.id,
          status: targetStatus
        })
      }, 15000)

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }

      const result = await res.json().catch(() => null)
      if (result && result.success === false) {
        throw new Error(result.error || 'Server menolak update status.')
      }

      showToast(`Status tiket #${ticket.id ? ticket.id.slice(0, 6) : ''} diubah ke "${targetStatus}"`, 'success')
    } catch (err) {
      console.error("Gagal update status:", err)
      // Rollback jika gagal
      ticket.status = prevStatus
      ticket.inProgressAt = prevInProgress
      ticket.doneAt = prevDone
      showToast("Gagal memperbarui status di Google Sheets. " + (err.message || ''), 'error')
    } finally {
      updatingId.value = null
    }
  }

  // Navigasi Status Bertahap: 'next' (maju) atau 'prev' (mundur)
  const stepStatus = async (ticket, direction) => {
    const statusOrder = ['Open', 'In Progress', 'Done']
    const currentIndex = statusOrder.findIndex(s => s.toLowerCase() === (ticket.status || 'open').toLowerCase())
    
    if (direction === 'next' && currentIndex < statusOrder.length - 1) {
      await setStatus(ticket, statusOrder[currentIndex + 1])
    } else if (direction === 'prev' && currentIndex > 0) {
      await setStatus(ticket, statusOrder[currentIndex - 1])
    }
  }

  // Hapus Tiket (Khusus Portal Elektromedis)
  const deleteTicket = async (ticket) => {
    if (!isApiConfigured.value || deletingId.value) return
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus tiket "${ticket.pekerjaan}"?`)
    if (!confirmed) return

    deletingId.value = ticket.id
    const prevTickets = [...tickets.value]
    tickets.value = tickets.value.filter(t => t.id !== ticket.id)

    try {
      const res = await fetchWithTimeout(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_ticket',
          id: ticket.id
        })
      }, 15000)

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }

      const result = await res.json().catch(() => null)
      if (result && result.success === false) {
        throw new Error(result.error || 'Server menolak penghapusan.')
      }

      showToast("Tiket berhasil dihapus!", 'success')
    } catch (err) {
      console.error("Gagal menghapus tiket:", err)
      tickets.value = prevTickets
      showToast("Gagal menghapus tiket di Google Sheets. " + (err.message || ''), 'error')
    } finally {
      deletingId.value = null
    }
  }

  // Format Tanggal & Jam Bahasa Indonesia yang Ringkas & Jelas di HP
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return '-'
      
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).replace('.', ':')
    } catch {
      return '-'
    }
  }

  // Hitung durasi pengerjaan tiket (antara In Progress dan Selesai)
  const calculateDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return null
    try {
      const start = new Date(startStr).getTime()
      const end = new Date(endStr).getTime()
      const diffMs = end - start
      if (diffMs <= 0 || isNaN(diffMs)) return null

      const totalMinutes = Math.floor(diffMs / (1000 * 60))
      if (totalMinutes < 60) {
        return `${totalMinutes} mnt`
      }
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      if (hours < 24) {
        return minutes > 0 ? `${hours} jam ${minutes} mnt` : `${hours} jam`
      }
      const days = Math.floor(hours / 24)
      return `${days} hari`
    } catch {
      return null
    }
  }

  // Helper untuk normalisasi tampilan prioritas (Cito vs Normal)
  const isCito = (priority) => {
    const p = String(priority || '').toLowerCase()
    return p === 'cito' || p === 'high'
  }

  return {
    API_URL,
    tickets,
    isLoading,
    isSubmitting,
    isCooldown,
    updatingId,
    deletingId,
    errorMessage,
    successMessage,
    filterStatus,
    searchQuery,
    form,
    isApiConfigured,
    stats,
    filteredTickets,
    showToast,
    fetchTickets,
    submitTicket,
    setStatus,
    stepStatus,
    deleteTicket,
    formatDateTime,
    calculateDuration,
    isCito
  }
}
