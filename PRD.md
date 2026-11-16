# Product Requirements Document (PRD) & Technical Blueprint
**Project Name:** Serverless Simple Ticketing System  
**Author:** Habib Al Farizi (dametechstudio)  
**Architecture:** Frontend (Vercel) + Serverless API (Google Apps Script) + Database (Google Sheets)

---

## 1. Executive Summary
Aplikasi *single-page* ringan untuk pencatatan dan pelacakan pekerjaan (ticketing) secara *real-time*. Sistem ini dirancang tanpa *backend server* tradisional untuk menekan biaya (gratis 100%) dan mempermudah *maintenance*. Menggunakan Vue 3 + Tailwind CSS untuk UI yang responsif, serta Google Sheets sebagai basis data transaksional yang dijembatani oleh Google Apps Script (GAS) sebagai REST API.

## 2. System Architecture & Tech Stack
*   **Frontend:** Vue 3 (Composition API), Vite, Tailwind CSS.
*   **Hosting:** Vercel (Auto-deployment via GitHub).
*   **Backend/API:** Google Apps Script (GAS) - `doGet()` dan `doPost()`.
*   **Database:** Google Sheets.
*   **Communication:** `fetch` API (JSON over HTTPS).

## 3. Database Schema (Google Sheets)
Buat Spreadsheet baru. Pada **Sheet1**, buat *header* di baris pertama (A1 - E1) dengan urutan persis seperti berikut:
1.  **ID** (String/UUID)
2.  **Timestamp** (Datetime)
3.  **Pekerjaan** (String)
4.  **Prioritas** (String: Low, Medium, High)
5.  **Status** (String: Open, In Progress, Done)

## 4. Google Apps Script (Backend API) Code
Buka *Spreadsheet* > **Extensions** > **Apps Script**. Hapus kode bawaan, *paste* kode di bawah ini, lalu klik **Deploy > New Deployment > Web App** (Execute as: Me, Access: Anyone).

```javascript
const SHEET_NAME = "Sheet1";

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return respondJSON([]);
  }

  const tickets = data.slice(1).map(row => ({
    id: row[0],
    timestamp: row[1],
    pekerjaan: row[2],
    prioritas: row[3],
    status: row[4]
  })).reverse(); // Balik urutan agar tiket terbaru di atas
  
  return respondJSON(tickets);
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const body = JSON.parse(e.postData.contents);
    
    const newId = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    
    sheet.appendRow([
      newId,
      timestamp,
      body.pekerjaan,
      body.prioritas,
      body.status || "Open"
    ]);
    
    return respondJSON({ success: true, message: "Tiket berhasil ditambahkan", id: newId });
  } catch (error) {
    return respondJSON({ success: false, error: error.message }, 500);
  }
}

function respondJSON(data, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
5. Frontend Implementation (Vue 3 + Tailwind)
Di dalam repositori Vue 3 Anda, cukup letakkan logika utama ini di file src/App.vue.

Setup Project:

Bash
npm create vite@latest ticketing-app -- --template vue
cd ticketing-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install
Konfigurasi .env:
Buat file .env di root folder repositori Anda. Masukkan URL Web App dari GAS.

Cuplikan kode
VITE_GAS_API_URL=[https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec](https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec)
Kode src/App.vue:

Cuplikan kode
<script setup>
import { ref, onMounted } from 'vue'

const API_URL = import.meta.env.VITE_GAS_API_URL
const tickets = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)

const form = ref({
  pekerjaan: '',
  prioritas: 'Medium'
})

// Ambil Data Tiket
const fetchTickets = async () => {
  isLoading.value = true
  try {
    const res = await fetch(API_URL)
    const data = await res.json()
    tickets.value = data
  } catch (error) {
    console.error("Gagal mengambil data:", error)
  } finally {
    isLoading.value = false
  }
}

// Tambah Tiket Baru
const submitTicket = async () => {
  if (!form.value.pekerjaan) return
  isSubmitting.value = true
  
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        pekerjaan: form.value.pekerjaan,
        prioritas: form.value.prioritas,
        status: 'Open'
      })
    })
    
    // Reset form dan refresh list
    form.value.pekerjaan = ''
    form.value.prioritas = 'Medium'
    await fetchTickets()
  } catch (error) {
    console.error("Gagal menyimpan data:", error)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchTickets()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-8">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Header -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 class="text-2xl font-bold text-gray-800">Job Ticketing System</h1>
        <p class="text-gray-500 text-sm mt-1">Catat dan pantau daftar pekerjaan secara real-time.</p>
      </div>

      <!-- Input Form -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <form @submit.prevent="submitTicket" class="flex flex-col md:flex-row gap-4">
          <input 
            v-model="form.pekerjaan" 
            type="text" 
            placeholder="Deskripsi pekerjaan..." 
            class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <select 
            v-model="form.prioritas"
            class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <button 
            type="submit" 
            :disabled="isSubmitting"
            class="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {{ isSubmitting ? 'Menyimpan...' : 'Tambah' }}
          </button>
        </form>
      </div>

      <!-- List Ticket -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div v-if="isLoading" class="p-8 text-center text-gray-500">
          Memuat data...
        </div>
        <ul v-else-if="tickets.length > 0" class="divide-y divide-gray-100">
          <li v-for="ticket in tickets" :key="ticket.id" class="p-6 hover:bg-gray-50 transition">
            <div class="flex justify-between items-start gap-4">
              <div>
                <h3 class="font-medium text-gray-900">{{ ticket.pekerjaan }}</h3>
                <p class="text-xs text-gray-400 mt-1">{{ new Date(ticket.timestamp).toLocaleString('id-ID') }}</p>
              </div>
              <div class="flex gap-2">
                <span class="px-2.5 py-1 text-xs rounded-full border bg-white" :class="{
                  'text-red-600 border-red-200': ticket.prioritas === 'High',
                  'text-yellow-600 border-yellow-200': ticket.prioritas === 'Medium',
                  'text-green-600 border-green-200': ticket.prioritas === 'Low'
                }">
                  {{ ticket.prioritas }}
                </span>
                <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                  {{ ticket.status }}
                </span>
              </div>
            </div>
          </li>
        </ul>
        <div v-else class="p-8 text-center text-gray-500">
          Belum ada tiket pekerjaan.
        </div>
      </div>
    </div>
  </div>
</template>
6. Deployment Guide (Vercel)
Push repositori Anda ke GitHub.

Login ke Vercel > Add New Project.

Pilih repositori ticketing Anda.

Pada menu Environment Variables, tambahkan:

Name: VITE_GAS_API_URL

Value: (URL Web App dari Apps Script Anda)

Klik Deploy.


<ElicitationsGroup message="Pilih langkah selanjutnya:">
  <Elicitation label="Deploy ke Vercel sekarang" query="Bantu saya review proses koneksi repo GitHub ke Vercel agar VITE_GAS_API_URL terbaca."/>
  <Elicitation label="Modifikasi UI/UX di Tailwind" query="Tambahkan efek animasi saat tiket baru muncul di list menggunakan Tailwind."/>
  <Elicitation label="Tambah fitur Edit Status" query="Ubah kodenya agar saya bisa mengklik status 'Open' dan mengubahnya jadi 'Done' langsung dari UI."/>
</ElicitationsGroup>