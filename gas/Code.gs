/**
 * Google Apps Script (GAS) Backend API for Simple Ticketing System
 * Author: Habib Al Farizi (dametechstudio)
 *
 * INSTRUKSI SETUP:
 * 1. Buat Spreadsheet baru di Google Sheets.
 * 2. Pastikan tab bernama "Sheet1".
 * 3. Baris pertama (A1 - E1) isi dengan header berikut:
 *    A1: ID
 *    B1: Timestamp
 *    C1: Pekerjaan
 *    D1: Prioritas
 *    E1: Status
 * 4. Buka menu Extensions > Apps Script.
 * 5. Hapus kode default (myFunction) dan paste seluruh isi file ini.
 * 6. Klik Deploy > New deployment:
 *    - Select type: Web app
 *    - Description: Ticketing API v1
 *    - Execute as: Me (<email Anda>)
 *    - Who has access: Anyone
 * 7. Klik Deploy, berikan otorisasi izin (Authorize Access).
 * 8. Salin "Web app URL" (format: https://script.google.com/macros/s/.../exec)
 *    dan masukkan ke dalam file .env di frontend:
 *    VITE_GAS_API_URL=<URL_TERSEBUT>
 */

const SHEET_NAME = "Sheet1";

/**
 * Handle HTTP GET Request
 * Mengambil seluruh data tiket dari Google Sheets
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return respondJSON({ success: false, error: "Sheet '" + SHEET_NAME + "' tidak ditemukan." }, 404);
    }

    const data = sheet.getDataRange().getValues();

    // Jika hanya ada header atau kosong
    if (data.length <= 1) {
      return respondJSON([]);
    }

    // Map setiap baris menjadi objek tiket (abaikan baris 0 / header)
    const tickets = data.slice(1).map(function(row) {
      return {
        id: String(row[0] || ""),
        timestamp: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
        pekerjaan: String(row[2] || ""),
        prioritas: String(row[3] || "Medium"),
        status: String(row[4] || "Open")
      };
    }).reverse(); // Membalik urutan agar tiket paling baru muncul di paling atas

    return respondJSON(tickets);
  } catch (error) {
    return respondJSON({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Handle HTTP POST Request
 * Menerima payload JSON untuk menambah tiket baru atau memperbarui status
 */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return respondJSON({ success: false, error: "Sheet '" + SHEET_NAME + "' tidak ditemukan." }, 404);
    }

    if (!e || !e.postData || !e.postData.contents) {
      return respondJSON({ success: false, error: "Payload kosong." }, 400);
    }

    const body = JSON.parse(e.postData.contents);

    // FITUR UPDATE STATUS (Jika request menyertakan action: 'update_status')
    if (body.action === "update_status" && body.id) {
      const data = sheet.getDataRange().getValues();
      let foundIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(body.id)) {
          foundIndex = i + 1; // Google Sheets row 1-indexed
          break;
        }
      }

      if (foundIndex === -1) {
        return respondJSON({ success: false, error: "Tiket dengan ID tersebut tidak ditemukan." }, 404);
      }

      // Kolom 5 adalah Status (E)
      sheet.getRange(foundIndex, 5).setValue(body.status || "Done");
      return respondJSON({ success: true, message: "Status tiket berhasil diperbarui", id: body.id, status: body.status });
    }

    // FITUR DEFAULT: Tambah Tiket Baru
    if (!body.pekerjaan || String(body.pekerjaan).trim() === "") {
      return respondJSON({ success: false, error: "Pekerjaan wajib diisi." }, 400);
    }

    const newId = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    const pekerjaan = String(body.pekerjaan).trim();
    const prioritas = body.prioritas || "Medium";
    const status = body.status || "Open";

    sheet.appendRow([
      newId,
      timestamp,
      pekerjaan,
      prioritas,
      status
    ]);

    return respondJSON({
      success: true,
      message: "Tiket berhasil ditambahkan",
      ticket: {
        id: newId,
        timestamp: timestamp,
        pekerjaan: pekerjaan,
        prioritas: prioritas,
        status: status
      }
    });
  } catch (error) {
    return respondJSON({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Helper untuk mengembalikan respons JSON dengan header CORS yang tepat
 */
function respondJSON(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
