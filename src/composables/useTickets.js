import { ref, computed } from 'vue'

const API_URL = import.meta.env.VITE_GAS_API_URL || ''

// Shared State agar sinkron antar halaman
const tickets = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const updatingId = ref(null)
const deletingId = ref(null)
const errorMessage = ref('')
const successMessage = ref('')

const filterStatus = ref('All')
const searchQuery = ref('')

const form = ref({
  pekerjaan: '',
  prioritas: 'Medium'
})

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

  // Filter & Pencarian Tiket
  const filteredTickets = computed(() => {
    return tickets.value.filter(ticket => {
      const matchesStatus = filterStatus.value === 'All' || 
        (ticket.status || '').toLowerCase() === filterStatus.value.toLowerCase()
      const matchesSearch = !searchQuery.value.trim() || 
        (ticket.pekerjaan || '').toLowerCase().includes(searchQuery.value.toLowerCase().trim())
      return matchesStatus && matchesSearch
    })
  })

  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      successMessage.value = message
      errorMessage.value = ''
      setTimeout(() => {
        successMessage.value = ''
      }, 4000)
    } else {
      errorMessage.value = message
      setTimeout(() => {
        errorMessage.value = ''
      }, 6000)
    }
  }

  // Mengambil Data Tiket dari Google Apps Script
  const fetchTickets = async () => {
    if (!isApiConfigured.value) return

    isLoading.value = true
    errorMessage.value = ''
    try {
      const res = await fetch(API_URL)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        tickets.value = data
      } else if (data && data.error) {
        throw new Error(data.error)
      } else {
        tickets.value = []
      }
    } catch (error) {
      console.error("Gagal mengambil data tiket:", error)
      showToast("Gagal memuat tiket dari Google Sheets. Pastikan Web App GAS telah di-deploy dengan akses 'Anyone'.", 'error')
    } finally {
      isLoading.value = false
    }
  }

  // Tambah Tiket Baru (Khusus Teknisi)
  const submitTicket = async () => {
    if (!form.value.pekerjaan.trim()) return

    if (!isApiConfigured.value) {
      showToast("VITE_GAS_API_URL belum dikonfigurasi di file .env", 'error')
      return
    }

    isSubmitting.value = true
    errorMessage.value = ''

    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          pekerjaan: form.value.pekerjaan.trim(),
          prioritas: form.value.prioritas,
          status: 'Open'
        })
      })

      showToast("Tiket pekerjaan berhasil ditambahkan!", 'success')
      form.value.pekerjaan = ''
      form.value.prioritas = 'Medium'
      
      await fetchTickets()
      return true
    } catch (error) {
      console.error("Gagal menyimpan data:", error)
      showToast("Terjadi kesalahan saat menyimpan tiket. Periksa koneksi atau URL Apps Script.", 'error')
      return false
    } finally {
      isSubmitting.value = false
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
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_status',
          id: ticket.id,
          status: targetStatus
        })
      })
      showToast(`Status tiket #${ticket.id ? ticket.id.slice(0, 6) : ''} diubah ke "${targetStatus}"`, 'success')
    } catch (err) {
      console.error("Gagal update status:", err)
      // Rollback jika gagal
      ticket.status = prevStatus
      ticket.inProgressAt = prevInProgress
      ticket.doneAt = prevDone
      showToast("Gagal memperbarui status di Google Sheets.", 'error')
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

  // Hapus Tiket (Khusus Teknisi)
  const deleteTicket = async (ticket) => {
    if (!isApiConfigured.value || deletingId.value) return
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus tiket "${ticket.pekerjaan}"?`)
    if (!confirmed) return

    deletingId.value = ticket.id
    const prevTickets = [...tickets.value]
    tickets.value = tickets.value.filter(t => t.id !== ticket.id)

    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_ticket',
          id: ticket.id
        })
      })
      showToast("Tiket berhasil dihapus!", 'success')
    } catch (err) {
      console.error("Gagal menghapus tiket:", err)
      tickets.value = prevTickets
      showToast("Gagal menghapus tiket di Google Sheets.", 'error')
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

  return {
    API_URL,
    tickets,
    isLoading,
    isSubmitting,
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
    calculateDuration
  }
}
