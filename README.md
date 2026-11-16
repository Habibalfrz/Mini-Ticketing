# Serverless Simple Ticketing System

Sistem pelacakan dan pencatatan pekerjaan (*ticketing*) modern, ringan, dan 100% *serverless* berbasis:
* **Frontend:** Vue 3 (Composition API) + Vite + Tailwind CSS
* **Backend:** Google Apps Script (GAS) Web App
* **Database:** Google Sheets
* **Hosting:** Vercel

---

## 📁 Struktur Direktori

```text
├── gas/
│   └── Code.gs           # Backend Google Apps Script (REST API)
├── src/
│   ├── App.vue           # Antarmuka Utama Aplikasi Ticketing
│   ├── main.js           # Entrypoint Vue 3
│   └── style.css         # Styling Tailwind CSS
├── index.html            # Entrypoint HTML
├── package.json          # Node Dependencies & Scripts
├── tailwind.config.js    # Konfigurasi Tailwind CSS
├── postcss.config.js     # Konfigurasi PostCSS
├── vite.config.js        # Konfigurasi Vite
├── .env.example          # Template konfigurasi environment variable
└── PRD.md                # Dokumen Blueprint & Spesifikasi
```

---

## 🚀 Panduan Setup Lengkap (Langkah demi Langkah)

### 1. Setup Google Sheets & Google Apps Script (Backend & Database)

1. Buka [Google Sheets](https://sheets.new) dan buat Spreadsheet baru (misal beri nama `Mini Ticketing DB`).
2. Pastikan tab lembar kerja bernama **`Sheet1`**.
3. Pada baris pertama (**A1 sampai E1**), buat header kolom persis berikut:
   * **A1:** `ID`
   * **B1:** `Timestamp`
   * **C1:** `Pekerjaan`
   * **D1:** `Prioritas`
   * **E1:** `Status`
4. Di Google Sheets, buka menu **Extensions** > **Apps Script**.
5. Hapus semua kode bawaan di editor, lalu salin seluruh isi file [`gas/Code.gs`](gas/Code.gs) dan tempel ke editor Apps Script.
6. Klik tombol **Deploy** di pojok kanan atas > pilih **New deployment**.
7. Klik ikon gear di sebelah kiri *Select type*, pilih **Web app**.
8. Konfigurasikan:
   * **Description:** `Ticketing API v1`
   * **Execute as:** `Me (<email-anda@gmail.com>)`
   * **Who has access:** `Anyone` *(PENTING: Wajib diset Anyone agar frontend dapat mengakses API)*.
9. Klik **Deploy**. Jika muncul jendela otorisasi akun Google:
   * Klik *Authorize access*.
   * Pilih akun Google Anda.
   * Klik *Advanced* > *Go to Untitled project (unsafe)* > Klik *Allow*.
10. Salin **Web app URL** yang muncul (format: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### 2. Setup Frontend Lokal

1. Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Buka file `.env` dan masukkan Web App URL yang Anda dapatkan dari langkah 1:
   ```env
   VITE_GAS_API_URL=https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec
   ```
3. Install dependensi proyek:
   ```bash
   npm install
   # atau menggunakan bun:
   # bun install
   ```
4. Jalankan server lokal (*development*):
   ```bash
   npm run dev
   # atau:
   # bun run dev
   ```
5. Buka tautan lokal yang muncul (biasanya `http://localhost:5173`) di browser Anda.

---

### 3. Deploy ke Vercel (Produksi)

1. Inisialisasi Git dan push repositori ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit simple ticketing system"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com) > Klik **Add New Project**.
3. Import repositori GitHub Anda.
4. Pada bagian **Environment Variables**, tambahkan:
   * **Key:** `VITE_GAS_API_URL`
   * **Value:** *(Web App URL dari Google Apps Script)*
5. Klik **Deploy**. Vercel akan otomatis mem-build dan menghasilkan URL live yang siap dipakai!

---

## 💡 Fitur Utama

- ⚡ **Real-time Ticket Tracking:** Tiket pekerjaan langsung tersimpan di Google Sheets.
- 🎯 **Priority Indicators:** Tag warna otomatis untuk *High* (Merah), *Medium* (Kuning), dan *Low* (Hijau).
- 🔄 **Interactive Status Cycling:** Klik badge status (*Open* ➔ *In Progress* ➔ *Done*) untuk memperbarui status langsung dari UI.
- 🔍 **Search & Filter:** Filter berdasarkan status tiket dan cari berdasarkan deskripsi pekerjaan.
- 📊 **Quick Metrics:** Penghitung otomatis total tiket, tiket open, in progress, dan done.
- 📱 **Fully Responsive:** Tampilan rapi di layar desktop maupun smartphone.
- 🛡️ **CORS & Redirect Safe:** Dirancang khusus untuk menghindari kendala CORS preflight pada Google Apps Script.
