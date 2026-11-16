<script setup>
import { onMounted } from 'vue'
import { useTickets } from '../composables/useTickets'

const {
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
  fetchTickets,
  submitTicket,
  setStatus,
  stepStatus,
  deleteTicket,
  formatDateTime,
  calculateDuration
} = useTickets()

onMounted(() => {
  if (tickets.value.length === 0) {
    fetchTickets()
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 md:p-10">
    <div class="max-w-4xl mx-auto space-y-4 sm:space-y-6">

      <!-- Alert Jika API URL Belum Dikonfigurasi -->
      <div v-if="!isApiConfigured" class="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-900 shadow-sm flex items-start gap-3">
        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="text-xs sm:text-sm">
          <h4 class="font-semibold text-sm sm:text-base mb-1">API URL Belum Dikonfigurasi</h4>
          <p class="text-amber-800 leading-relaxed">
            Frontend belum terhubung ke Google Apps Script. Silakan isi variabel 
            <code class="px-1.5 py-0.5 bg-amber-100 rounded font-mono font-semibold">VITE_GAS_API_URL</code> 
            di file <code class="px-1.5 py-0.5 bg-amber-100 rounded font-mono">.env</code>.
          </p>
        </div>
      </div>

      <!-- Toast Feedback (Error / Success) -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-800 p-3.5 sm:p-4 rounded-xl shadow-sm flex justify-between items-center text-xs sm:text-sm">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
        <button @click="errorMessage = ''" class="text-red-500 hover:text-red-700 text-base font-bold ml-2">✕</button>
      </div>

      <div v-if="successMessage" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 sm:p-4 rounded-xl shadow-sm flex justify-between items-center text-xs sm:text-sm">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>{{ successMessage }}</span>
        </div>
        <button @click="successMessage = ''" class="text-emerald-500 hover:text-emerald-700 text-base font-bold ml-2">✕</button>
      </div>

      <!-- Header Card (Mobile-Optimized) -->
      <div class="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Portal Teknisi</h1>
                <span class="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Mode Kelola
                </span>
              </div>
              <p class="text-slate-500 text-xs sm:text-sm mt-0.5">Input pekerjaan baru & kelola status progres secara real-time.</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <router-link 
            to="/" 
            target="_blank"
            class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="Buka tampilan publik di tab baru"
          >
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            <span>Preview Publik</span>
          </router-link>

          <button 
            @click="fetchTickets" 
            :disabled="isLoading || !isApiConfigured"
            class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>{{ isLoading ? 'Sinkron...' : 'Refresh' }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Cards (Grid 2x2 di HP, 4 kolom di Desktop) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div class="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Tiket</p>
          <p class="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-[11px] font-medium text-blue-500 uppercase tracking-wider">Open</p>
          <p class="text-xl sm:text-2xl font-bold text-blue-600 mt-0.5 sm:mt-1">{{ stats.open }}</p>
        </div>
        <div class="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-[11px] font-medium text-amber-500 uppercase tracking-wider">In Progress</p>
          <p class="text-xl sm:text-2xl font-bold text-amber-600 mt-0.5 sm:mt-1">{{ stats.inProgress }}</p>
        </div>
        <div class="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm">
          <p class="text-[11px] font-medium text-emerald-500 uppercase tracking-wider">Done</p>
          <p class="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5 sm:mt-1">{{ stats.done }}</p>
        </div>
      </div>

      <!-- Form Input Tiket Baru (Mobile-Friendly) -->
      <div class="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 class="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Input Pekerjaan Baru
        </h2>
        <form @submit.prevent="submitTicket" class="flex flex-col md:flex-row gap-2.5 sm:gap-3">
          <div class="flex-1">
            <input 
              v-model="form.pekerjaan" 
              type="text" 
              placeholder="Deskripsi pekerjaan yang akan/sedang dikerjakan..." 
              class="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-sm min-h-[44px]"
              required
            />
          </div>
          <div class="w-full md:w-44">
            <select 
              v-model="form.prioritas"
              class="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-sm cursor-pointer min-h-[44px]"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>
          <button 
            type="submit" 
            :disabled="isSubmitting || !form.pekerjaan.trim()"
            class="w-full md:w-auto px-6 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer min-h-[44px]"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Tambah Tiket' }}</span>
          </button>
        </form>
      </div>

      <!-- Controls: Filter & Search Bar (Mobile Responsive) -->
      <div class="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
        <!-- Filter Tabs (Bisa di-scroll horizontal di layar sangat kecil) -->
        <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
          <button 
            v-for="status in ['All', 'Open', 'In Progress', 'Done']" 
            :key="status"
            @click="filterStatus = status"
            class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer whitespace-nowrap min-h-[36px] flex items-center justify-center"
            :class="filterStatus === status ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
          >
            {{ status === 'All' ? 'Semua' : status }}
          </button>
        </div>

        <!-- Search Input -->
        <div class="w-full sm:w-64">
          <div class="relative">
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Cari pekerjaan..." 
              class="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition min-h-[40px]"
            />
          </div>
        </div>
      </div>

      <!-- List Tiket (Card Layout yang Dioptimalkan untuk HP) -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <!-- Loading State -->
        <div v-if="isLoading && tickets.length === 0" class="p-8 sm:p-12 text-center">
          <svg class="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 animate-spin mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <p class="text-xs sm:text-sm font-medium text-slate-600">Memuat data tiket dari Google Sheets...</p>
        </div>

        <!-- Tiket Tersedia -->
        <ul v-else-if="filteredTickets.length > 0" class="divide-y divide-slate-100">
          <li 
            v-for="ticket in filteredTickets" 
            :key="ticket.id" 
            class="p-4 sm:p-5 hover:bg-slate-50/70 transition space-y-3"
          >
            <!-- Baris 1: Priority Badge, Ticket ID, & Tombol Hapus -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <!-- Priority Badge -->
                <span 
                  class="px-2 py-0.5 text-[11px] font-semibold rounded-md border"
                  :class="{
                    'text-rose-700 bg-rose-50 border-rose-200': ticket.prioritas === 'High',
                    'text-amber-700 bg-amber-50 border-amber-200': ticket.prioritas === 'Medium',
                    'text-emerald-700 bg-emerald-50 border-emerald-200': ticket.prioritas === 'Low'
                  }"
                >
                  {{ ticket.prioritas }}
                </span>

                <span v-if="ticket.id" class="text-[11px] text-slate-400 font-mono" :title="ticket.id">
                  #{{ ticket.id.slice(0, 8) }}
                </span>
              </div>

              <!-- Tombol Hapus Tiket -->
              <button 
                @click="deleteTicket(ticket)"
                :disabled="deletingId === ticket.id"
                title="Hapus tiket pekerjaan ini"
                class="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px]"
              >
                <svg v-if="deletingId === ticket.id" class="w-4 h-4 animate-spin text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>

            <!-- Baris 2: Deskripsi Pekerjaan -->
            <div>
              <h3 
                class="font-medium text-slate-900 text-sm sm:text-base leading-snug break-words"
                :class="{ 'line-through text-slate-400': (ticket.status || '').toLowerCase() === 'done' }"
              >
                {{ ticket.pekerjaan }}
              </h3>
            </div>

            <!-- Baris 3: Tracking Waktu (Dibuat, On Progress, Selesai) -->
            <div class="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <!-- Waktu Dibuat -->
              <div class="flex items-center gap-1.5 text-slate-600">
                <span class="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span class="text-slate-400">Dibuat:</span>
                <span class="font-medium text-slate-700">{{ formatDateTime(ticket.timestamp) }}</span>
              </div>

              <!-- Waktu Mulai Dikerjakan (In Progress) -->
              <div class="flex items-center gap-1.5" :class="ticket.inProgressAt ? 'text-amber-800' : 'text-slate-400'">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="ticket.inProgressAt ? 'bg-amber-500' : 'bg-slate-300'"></span>
                <span :class="ticket.inProgressAt ? 'text-amber-600' : 'text-slate-400'">Diproses:</span>
                <span class="font-medium">{{ ticket.inProgressAt ? formatDateTime(ticket.inProgressAt) : 'Belum' }}</span>
              </div>

              <!-- Waktu Selesai (Done) -->
              <div class="flex items-center gap-1.5" :class="ticket.doneAt ? 'text-emerald-800' : 'text-slate-400'">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="ticket.doneAt ? 'bg-emerald-500' : 'bg-slate-300'"></span>
                <span :class="ticket.doneAt ? 'text-emerald-600' : 'text-slate-400'">Selesai:</span>
                <span class="font-medium">{{ ticket.doneAt ? formatDateTime(ticket.doneAt) : 'Belum' }}</span>
                <span v-if="ticket.doneAt && calculateDuration(ticket.inProgressAt, ticket.doneAt)" class="ml-auto text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  ⏱️ {{ calculateDuration(ticket.inProgressAt, ticket.doneAt) }}
                </span>
              </div>
            </div>

            <!-- Baris 4: Kontrol Status Bisa Maju & Mundur (Sangat Ramah HP) -->
            <div class="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <span class="text-xs text-slate-400 font-medium">Ubah Status Pekerjaan:</span>

              <div class="flex items-center gap-1.5 self-stretch sm:self-auto">
                <!-- Tombol Mundur (Prev) -->
                <button 
                  @click="stepStatus(ticket, 'prev')"
                  :disabled="updatingId === ticket.id || (ticket.status || 'open').toLowerCase() === 'open'"
                  title="Kembalikan status satu tahap ke belakang"
                  class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border transition min-h-[38px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="(ticket.status || 'open').toLowerCase() === 'open' 
                    ? 'bg-slate-100 text-slate-400 border-slate-200' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                  <span>Mundur</span>
                </button>

                <!-- Dropdown Status Langsung (Pilih Bebas) -->
                <div class="relative flex-1 sm:flex-none">
                  <select 
                    :value="ticket.status || 'Open'"
                    @change="setStatus(ticket, $event.target.value)"
                    :disabled="updatingId === ticket.id"
                    class="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border transition min-h-[38px] cursor-pointer text-center"
                    :class="{
                      'bg-blue-50 text-blue-700 border-blue-200': (ticket.status || 'open').toLowerCase() === 'open',
                      'bg-amber-50 text-amber-700 border-amber-200': (ticket.status || '').toLowerCase() === 'in progress',
                      'bg-emerald-50 text-emerald-700 border-emerald-200': (ticket.status || '').toLowerCase() === 'done'
                    }"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </div>

                <!-- Tombol Maju (Next) -->
                <button 
                  @click="stepStatus(ticket, 'next')"
                  :disabled="updatingId === ticket.id || (ticket.status || '').toLowerCase() === 'done'"
                  title="Majukan status satu tahap ke depan"
                  class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border transition min-h-[38px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="(ticket.status || '').toLowerCase() === 'done' 
                    ? 'bg-slate-100 text-slate-400 border-slate-200' 
                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-xs'"
                >
                  <span v-if="updatingId === ticket.id" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span v-else>Maju</span>
                  <svg v-if="updatingId !== ticket.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </li>
        </ul>

        <!-- Empty State -->
        <div v-else class="p-8 sm:p-12 text-center">
          <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
          </div>
          <h4 class="text-sm font-semibold text-slate-700">Belum ada tiket pekerjaan</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {{ searchQuery ? 'Tidak ada tiket yang cocok dengan pencarian.' : 'Gunakan form di atas untuk menambahkan catatan pekerjaan baru.' }}
          </p>
        </div>
      </div>

      <!-- Footer Info -->
      <footer class="text-center text-xs text-slate-400 pt-3 sm:pt-4">
        Portal Manajemen Pekerjaan Teknisi &bull; Serverless Sheets API
      </footer>

    </div>
  </div>
</template>
