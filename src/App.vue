<script setup>
import { ref, computed, onMounted } from 'vue'

const API_URL = import.meta.env.VITE_GAS_API_URL || ''

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

// Deteksi apakah konfigurasi API URL sudah diset
const isApiConfigured = computed(() => {
  return API_URL && API_URL.trim() !== '' && !API_URL.includes('YOUR_SCRIPT_ID')
})

// Statistik Tiket
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

// Ambil Data Tiket dari Google Apps Script
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

// Tambah Tiket Baru
const submitTicket = async () => {
  if (!form.value.pekerjaan.trim()) return

  if (!isApiConfigured.value) {
    showToast("VITE_GAS_API_URL belum dikonfigurasi di file .env", 'error')
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // Catatan: fetch POST ke GAS tanpa header Content-Type application/json
    // sengaja dipakai agar diperlakukan sebagai simple request (menghindari CORS preflight)
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        pekerjaan: form.value.pekerjaan.trim(),
        prioritas: form.value.prioritas,
        status: 'Open'
      })
    })

    showToast("Tiket pekerjaan berhasil ditambahkan!", 'success')
    // Reset form
    form.value.pekerjaan = ''
    form.value.prioritas = 'Medium'
    
    // Refresh list data terbaru
    await fetchTickets()
  } catch (error) {
    console.error("Gagal menyimpan data:", error)
    showToast("Terjadi kesalahan saat menyimpan tiket. Periksa koneksi atau URL Apps Script.", 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Update Status Tiket (Open -> In Progress -> Done)
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
    showToast(`Status tiket diubah menjadi "${nextStatus}"`, 'success')
  } catch (err) {
    console.error("Gagal update status:", err)
    // Rollback jika gagal
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

onMounted(() => {
  fetchTickets()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 md:p-10">
    <div class="max-w-4xl mx-auto space-y-6">

      <!-- Alert Jika API URL Belum Dikonfigurasi -->
      <div v-if="!isApiConfigured" class="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 shadow-sm flex items-start gap-3">
        <svg class="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="text-sm">
          <h4 class="font-semibold text-base mb-1">API URL Belum Dikonfigurasi</h4>
          <p class="text-amber-800 leading-relaxed">
            Frontend belum terhubung ke Google Apps Script. Silakan isi variabel 
            <code class="px-2 py-0.5 bg-amber-100 rounded font-mono font-semibold">VITE_GAS_API_URL</code> 
            di file <code class="px-2 py-0.5 bg-amber-100 rounded font-mono">.env</code> dengan URL Web App Apps Script Anda.
          </p>
        </div>
      </div>

      <!-- Toast Feedback (Error / Success) -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl shadow-sm flex justify-between items-center text-sm">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
        <button @click="errorMessage = ''" class="text-red-500 hover:text-red-700">✕</button>
      </div>

      <div v-if="successMessage" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-sm flex justify-between items-center text-sm">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>{{ successMessage }}</span>
        </div>
        <button @click="successMessage = ''" class="text-emerald-500 hover:text-emerald-700">✕</button>
      </div>

      <!-- Header Card -->
      <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-slate-900">Job Ticketing System</h1>
              <p class="text-slate-500 text-sm mt-0.5">Catat dan pantau daftar pekerjaan secara real-time via Serverless Sheets.</p>
            </div>
          </div>
        </div>

        <button 
          @click="fetchTickets" 
          :disabled="isLoading || !isApiConfigured"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50 self-start sm:self-auto"
          title="Refresh Data"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>{{ isLoading ? 'Menyinkronkan...' : 'Refresh' }}</span>
        </button>
      </div>

      <!-- Quick Metrics Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Tiket</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-xs font-medium text-blue-500 uppercase tracking-wider">Open</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ stats.open }}</p>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-xs font-medium text-amber-500 uppercase tracking-wider">In Progress</p>
          <p class="text-2xl font-bold text-amber-600 mt-1">{{ stats.inProgress }}</p>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-xs font-medium text-emerald-500 uppercase tracking-wider">Done</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ stats.done }}</p>
        </div>
      </div>

      <!-- Form Input Tiket Baru -->
      <div class="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-100">
        <h2 class="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Tambah Tiket Baru
        </h2>
        <form @submit.prevent="submitTicket" class="flex flex-col md:flex-row gap-3">
          <div class="flex-1">
            <input 
              v-model="form.pekerjaan" 
              type="text" 
              placeholder="Apa pekerjaan yang perlu diselesaikan?..." 
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm"
              required
            />
          </div>
          <div class="w-full md:w-44">
            <select 
              v-model="form.prioritas"
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm cursor-pointer"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>
          <button 
            type="submit" 
            :disabled="isSubmitting || !form.pekerjaan.trim()"
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Tambah Tiket' }}</span>
          </button>
        </form>
      </div>

      <!-- Controls: Search & Filter Tabs -->
      <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-100 shadow-sm w-full sm:w-auto">
          <button 
            v-for="status in ['All', 'Open', 'In Progress', 'Done']" 
            :key="status"
            @click="filterStatus = status"
            class="px-3.5 py-1.5 text-xs font-medium rounded-lg transition"
            :class="filterStatus === status ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
          >
            {{ status === 'All' ? 'Semua' : status }}
          </button>
        </div>

        <div class="w-full sm:w-64">
          <div class="relative">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Cari tiket pekerjaan..." 
              class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>
      </div>

      <!-- List Tiket -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <!-- Loading State -->
        <div v-if="isLoading && tickets.length === 0" class="p-12 text-center">
          <svg class="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <p class="text-sm font-medium text-slate-600">Memuat data tiket dari Google Sheets...</p>
        </div>

        <!-- Tiket Tersedia -->
        <ul v-else-if="filteredTickets.length > 0" class="divide-y divide-slate-100">
          <li 
            v-for="ticket in filteredTickets" 
            :key="ticket.id" 
            class="p-5 sm:p-6 hover:bg-slate-50/70 transition flex flex-col sm:flex-row justify-between sm:items-center gap-4"
          >
            <div class="space-y-1.5 flex-1 pr-2">
              <div class="flex items-start gap-2">
                <h3 
                  class="font-medium text-slate-900 text-sm sm:text-base leading-snug break-words"
                  :class="{ 'line-through text-slate-400': (ticket.status || '').toLowerCase() === 'done' }"
                >
                  {{ ticket.pekerjaan }}
                </h3>
              </div>
              <div class="flex items-center gap-3 text-xs text-slate-400">
                <span class="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {{ formatDate(ticket.timestamp) }}
                </span>
                <span v-if="ticket.id" class="text-slate-300">•</span>
                <span v-if="ticket.id" class="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" :title="ticket.id">
                  #{{ ticket.id.slice(0, 8) }}
                </span>
              </div>
            </div>

            <!-- Badges & Action -->
            <div class="flex items-center gap-2.5 flex-shrink-0 self-end sm:self-auto">
              <!-- Priority Badge -->
              <span 
                class="px-2.5 py-1 text-xs font-medium rounded-lg border"
                :class="{
                  'text-rose-700 bg-rose-50 border-rose-200': ticket.prioritas === 'High',
                  'text-amber-700 bg-amber-50 border-amber-200': ticket.prioritas === 'Medium',
                  'text-emerald-700 bg-emerald-50 border-emerald-200': ticket.prioritas === 'Low'
                }"
              >
                {{ ticket.prioritas }}
              </span>

              <!-- Status Button (Interactive cycle status) -->
              <button 
                @click="cycleStatus(ticket)"
                :disabled="updatingId === ticket.id"
                title="Klik untuk mengubah status tiket"
                class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition border cursor-pointer hover:shadow-xs active:scale-95 disabled:opacity-50"
                :class="{
                  'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100': (ticket.status || 'open').toLowerCase() === 'open',
                  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100': (ticket.status || '').toLowerCase() === 'in progress',
                  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100': (ticket.status || '').toLowerCase() === 'done'
                }"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="{
                  'bg-blue-500': (ticket.status || 'open').toLowerCase() === 'open',
                  'bg-amber-500': (ticket.status || '').toLowerCase() === 'in progress',
                  'bg-emerald-500': (ticket.status || '').toLowerCase() === 'done'
                }"></span>
                <span>{{ ticket.status || 'Open' }}</span>
                <svg v-if="updatingId === ticket.id" class="w-3 h-3 animate-spin ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
            </div>
          </li>
        </ul>

        <!-- Empty State -->
        <div v-else class="p-12 text-center">
          <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
          </div>
          <h4 class="text-sm font-semibold text-slate-700">Belum ada tiket pekerjaan</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {{ searchQuery ? 'Tidak ada tiket yang sesuai dengan pencarian Anda.' : 'Gunakan form di atas untuk menambahkan catatan pekerjaan baru.' }}
          </p>
        </div>
      </div>

      <!-- Footer Info -->
      <footer class="text-center text-xs text-slate-400 pt-4">
        Serverless Simple Ticketing System &bull; Vue 3 + Tailwind CSS + Google Sheets API
      </footer>

    </div>
  </div>
</template>
