/**
 * Google Apps Script (GAS) Backend API for Job Tracking Elektromedis
 * Author: Habib Al Farizi (dametechstudio)
 *
 * STRUKTUR KOLOM GOOGLE SHEETS:
 * A1: ID
 * B1: Timestamp (Waktu Dibuat)
 * C1: Pekerjaan
 * D1: Prioritas (Cito / Normal)
 * E1: Status (Open, In Progress, Done)
 * F1: InProgressAt (Waktu Mulai Dikerjakan)
 * G1: DoneAt (Waktu Selesai)
 * H1: Order By (Pemesan / Ruangan / Unit)
 *
 * INSTRUKSI DEPLOY ULANG:
 * 1. Buka Spreadsheet Anda > Extensions > Apps Script.
 * 2. Timpa seluruh isi editor dengan file ini, lalu simpan (Ctrl+S / Cmd+S).
 * 3. Deploy > Manage deployments > Edit (pensil) > Version: New version > Deploy.
 */

const SHEET_NAME = "Sheet1";

/**
 * Handle HTTP GET Request
 * Mengambil seluruh data tiket dari Google Sheets beserta tracking waktu dan Order By
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

    // Map setiap baris menjadi objek tiket
    const tickets = data.slice(1).map(function(row) {
      return {
        id: String(row[0] || ""),
        timestamp: row[1] ? new Date(row[1]).toISOString() : "",
        pekerjaan: String(row[2] || ""),
        prioritas: String(row[3] || "Normal"),
        status: String(row[4] || "Open"),
        inProgressAt: row[5] ? new Date(row[5]).toISOString() : "",
        doneAt: row[6] ? new Date(row[6]).toISOString() : "",
        orderBy: String(row[7] || "")
      };
    }).reverse(); // Tiket terbaru di atas

    return respondJSON(tickets);
  } catch (error) {
    return respondJSON({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Handle HTTP POST Request
 * Menerima payload JSON untuk menambah tiket baru, update status (maju/mundur + tracking waktu), atau hapus tiket
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

    // FITUR UPDATE STATUS (Bisa maju / mundur dengan reset timestamp akurat)
    if (body.action === "update_status" && body.id) {
      const data = sheet.getDataRange().getValues();
      let foundIndex = -1;
      let existingRow = null;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(body.id)) {
          foundIndex = i + 1; // Google Sheets row 1-indexed
          existingRow = data[i];
          break;
        }
      }

      if (foundIndex === -1) {
        return respondJSON({ success: false, error: "Tiket dengan ID tersebut tidak ditemukan." }, 404);
      }

      const targetStatus = body.status || "Open";
      const nowIso = new Date().toISOString();
      let inProgressAt = existingRow[5] ? new Date(existingRow[5]).toISOString() : "";
      let doneAt = existingRow[6] ? new Date(existingRow[6]).toISOString() : "";

      // Logika update & reset timestamp:
      if (targetStatus === "Open") {
        // Mundur ke Open -> kosongkan waktu In Progress dan Done
        inProgressAt = "";
        doneAt = "";
      } else if (targetStatus === "In Progress") {
        // Masuk In Progress -> set waktu In Progress saat ini, kosongkan waktu Done
        inProgressAt = nowIso;
        doneAt = "";
      } else if (targetStatus === "Done") {
        // Selesai (Done) -> set waktu Done saat ini. Jika belum ada in progress, isi nowIso juga
        if (!inProgressAt) {
          inProgressAt = nowIso;
        }
        doneAt = nowIso;
      }

      // Kolom 5 = Status (E), Kolom 6 = InProgressAt (F), Kolom 7 = DoneAt (G)
      sheet.getRange(foundIndex, 5, 1, 3).setValues([[targetStatus, inProgressAt, doneAt]]);

      return respondJSON({
        success: true,
        message: "Status tiket berhasil diperbarui",
        id: body.id,
        status: targetStatus,
        inProgressAt: inProgressAt,
        doneAt: doneAt
      });
    }

    // FITUR HAPUS TIKET
    if (body.action === "delete_ticket" && body.id) {
      const data = sheet.getDataRange().getValues();
      let foundIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(body.id)) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex === -1) {
        return respondJSON({ success: false, error: "Tiket tidak ditemukan." }, 404);
      }

      sheet.deleteRow(foundIndex);
      return respondJSON({ success: true, message: "Tiket berhasil dihapus", id: body.id });
    }

    // FITUR DEFAULT: Tambah Tiket Baru
    if (!body.pekerjaan || String(body.pekerjaan).trim() === "") {
      return respondJSON({ success: false, error: "Deskripsi pekerjaan wajib diisi." }, 400);
    }

    const pekerjaan = String(body.pekerjaan).trim();
    const prioritas = body.prioritas === "Cito" ? "Cito" : "Normal";
    const status = body.status || "Open";
    const orderBy = String(body.orderBy || body.order_by || "").trim();

    // PENCEGAHAN DOUBLE SUBMIT PADA BACKEND:
    // Cek jika baris terakhir memiliki pekerjaan dan order_by yang identik dalam rentang waktu < 5 detik
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const lastRowData = sheet.getRange(lastRow, 1, 1, Math.max(8, sheet.getLastColumn())).getValues()[0];
      const lastPekerjaan = String(lastRowData[2] || "").trim();
      const lastOrderBy = String(lastRowData[7] || "").trim();
      const lastTimestamp = lastRowData[1] ? new Date(lastRowData[1]).getTime() : 0;
      const currentTimestamp = new Date().getTime();

      if (
        lastPekerjaan.toLowerCase() === pekerjaan.toLowerCase() &&
        lastOrderBy.toLowerCase() === orderBy.toLowerCase() &&
        (currentTimestamp - lastTimestamp) < 5000
      ) {
        return respondJSON({
          success: true,
          message: "Tiket terdeteksi duplikat dan telah diamankan (tidak disimpan ulang).",
          duplicate: true,
          ticket: {
            id: String(lastRowData[0]),
            timestamp: String(lastRowData[1]),
            pekerjaan: lastPekerjaan,
            prioritas: String(lastRowData[3] || prioritas),
            status: String(lastRowData[4] || status),
            inProgressAt: String(lastRowData[5] || ""),
            doneAt: String(lastRowData[6] || ""),
            orderBy: lastOrderBy
          }
        });
      }
    }

    const newId = Utilities.getUuid();
    const timestamp = new Date().toISOString();

    // Auto-tambahkan header kolom 'Order By' pada baris 1 kolom H (kolom 8) jika masih kosong
    if (sheet.getLastRow() >= 1 && sheet.getRange(1, 8).getValue() === "") {
      sheet.getRange(1, 8).setValue("Order By");
    }

    // Append baris lengkap (8 kolom: ID, Timestamp, Pekerjaan, Prioritas, Status, InProgressAt, DoneAt, Order By)
    sheet.appendRow([
      newId,
      timestamp,
      pekerjaan,
      prioritas,
      status,
      "", // inProgressAt kosong di awal
      "", // doneAt kosong di awal
      orderBy
    ]);

    return respondJSON({
      success: true,
      message: "Tiket elektromedis berhasil ditambahkan",
      ticket: {
        id: newId,
        timestamp: timestamp,
        pekerjaan: pekerjaan,
        prioritas: prioritas,
        status: status,
        inProgressAt: "",
        doneAt: "",
        orderBy: orderBy
      }
    });
  } catch (error) {
    return respondJSON({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Helper untuk mengembalikan respons JSON
 */
function respondJSON(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
