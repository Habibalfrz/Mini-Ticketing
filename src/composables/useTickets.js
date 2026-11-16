import { ref, computed } from 'vue'

const API_URL = import.meta.env.VITE_GAS_API_URL || ''

// Shared State agar sinkron jika berpindah halaman
const tickets = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const updatingId = ref(null)
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
      // POST ke GAS tanpa header Content-Type application/json agar dianggap simple request (CORS safe)
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

  // Update Status Tiket (Open -> In Progress -> Done) (Khusus Teknisi)
  const cycleStatus = async (ticket) => {
    if (!isApiConfigured.value || updatingId.value) return

    const statusOrder = ['Open', 'In Progress', 'Done']
    const currentIndex = statusOrder.findIndex(s => s.toLowerCase() === (ticket.status || 'open').toLowerCase())
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]

    updatingId.value = ticket.id

    // Optimistic UI update
    const previousStatus = ticket.status
    ticket.status = nextStatus

    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_status',
          id: ticket.id,
          status: nextStatus
        })
      })
      showToast(`Status tiket #${ticket.id ? ticket.id.slice(0, 6) : ''} diubah menjadi "${nextStatus}"`, 'success')
    } catch (err) {
      console.error("Gagal update status:", err)
      ticket.status = previousStatus
      showToast("Gagal memperbarui status di Google Sheets.", 'error')
    } finally {
      updatingId.value = null
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return {
    API_URL,
    tickets,
    isLoading,
    isSubmitting,
    updatingId,
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
    cycleStatus,
    formatDate
  }
}
