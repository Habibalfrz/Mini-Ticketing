# Job Tracking Elektromedis (Serverless Hospital Ticketing System)

Sistem pelacakan dan pencatatan pekerjaan (*ticketing*) pemeliharaan serta perbaikan alat elektromedis rumah sakit/klinik secara modern, ringan, dan 100% *serverless* berbasis:
* **Frontend:** Vue 3 (Composition API) + Vite + Tailwind CSS
* **Backend:** Google Apps Script (GAS) Web App
* **Database:** Google Sheets
* **Hosting:** Vercel

---

## 📁 Struktur Direktori & Halaman

```text
├── gas/
│   └── Code.gs                  # Backend Google Apps Script (REST API + Anti-duplikasi)
├── src/
│   ├── views/
│   │   ├── PublicBoard.vue      # Halaman Publik (/) - Job Tracking Elektromedis
│   │   └── TechnicianPortal.vue # Portal Elektromedis (/elektromedis & /teknisi)
│   ├── composables/
│   │   └── useTickets.js        # Logic, Anti-Double Submit & Reusable State
│   ├── router/
│   │   └── index.js             # Konfigurasi Vue Router (/ dan /elektromedis)
│   ├── App.vue                  # Root Container (<router-view />)
│   ├── main.js                  # Entrypoint Vue 3 & Router
│   └── style.css                # Styling Tailwind CSS
├── index.html                   # Entrypoint HTML (Mobile Optimized)
├── package.json                 # Node Dependencies & Scripts
├── vercel.json                  # SPA Routing Rewrite untuk Vercel
├── tailwind.config.js           # Konfigurasi Tailwind CSS
├── vite.config.js               # Konfigurasi Vite
└── PRD.md                       # Dokumen Blueprint & Spesifikasi
```

---

## 🌐 Akses Halaman

* **`http://localhost:5173/` (Job Tracking Elektromedis - Publik):**  
  Tampilan publik untuk memantau status pengerjaan alat medis secara transparan (*read-only*), lengkap dengan durasi perbaikan, badge urgensi (*Cito* / *Normal*), dan unit pemesan (*Order By*).
* **`http://localhost:5173/elektromedis` (Portal Elektromedis - Manajemen):**  
  Portal khusus staf elektromedis untuk menginput pekerjaan baru, menentukan urgensi (*Cito* / *Normal*), mencatat pemesan/unit (*Order By*), dan mengelola progres pengerjaan (*Open* ➔ *In Progress* ➔ *Done*). Rute lama `/teknisi` otomatis dialihkan ke rute ini.

---

## 🚀 Panduan Setup Spreadsheet & Google Apps Script

### Struktur Kolom Google Sheets (`Sheet1`):
1. **A1:** `ID` (UUID Otomatis)
2. **B1:** `Timestamp` (Waktu Dibuat)
3. **C1:** `Pekerjaan` (Nama Alat / Kerusakan)
4. **D1:** `Prioritas` (`Cito` / `Normal`)
5. **E1:** `Status` (`Open`, `In Progress`, `Done`)
6. **F1:** `InProgressAt` (Waktu Mulai Diproses)
7. **G1:** `DoneAt` (Waktu Selesai)
8. **H1:** `Order By` (Pemesan / Unit Ruangan)

### Langkah Deploy Apps Script:
1. Buka [Google Sheets](https://sheets.new) dan pastikan nama sheet adalah **`Sheet1`**.
2. Masukkan header di baris 1 (A1 sampai H1) sesuai struktur di atas.
3. Buka menu **Extensions** > **Apps Script**.
4. Salin seluruh isi file [`gas/Code.gs`](gas/Code.gs) dan tempelkan ke editor Apps Script.
5. Klik **Deploy** > **Manage deployments** (atau **New deployment**).
6. Konfigurasikan:
   * **Select type:** `Web app`
   * **Execute as:** `Me (<email-anda@gmail.com>)`
   * **Who has access:** `Anyone` *(PENTING: Wajib Anyone agar dapat diakses dari web frontend)*.
7. Salin URL Web App yang dihasilkan ke file `.env` pada variabel `VITE_GAS_API_URL`.

---

## 💡 Fitur Unggulan

- 🏥 **Khas Operasional Rumah Sakit:** Urgensi medis dengan 2 opsi (*Cito* & *Normal*), serta kolom pencatatan unit pemesan (*Order By*).
- 🛡️ **Pencegahan Double Input Berlapis (Anti Double-Submit):**
  - Tombol submit otomatis didisable seketika pada klik pertama disertai animasi spinner.
  - Guard check sinkron di composable logic.
  - Cooldown lock selama 1 detik pasca submit.
  - Deduplikasi otomatis di Google Apps Script dalam jeda 5 detik.
- 📱 **Mobile-First Experience:** Ukuran font input &ge; 16px (mencegah auto-zoom iOS), touch target &ge; 44px, layout formulir responsif, dan sticky floating toast alert.
- ⏱️ **Kalkulasi Durasi Otomatis:** Menghitung waktu penyelesaian dari mulai diproses (*In Progress*) hingga selesai (*Done*).
- 🔍 **Pencarian Cepat:** Pencarian real-time pada nama alat/pekerjaan sekaligus unit pemesan (*Order By*).
