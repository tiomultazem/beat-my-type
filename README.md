# FasihSM Guard - Ekstensi Browser

**Versi:** 1.8.1

## Apa itu FasihSM Guard?

Ekstensi browser ini membantu Anda tetap login di aplikasi Fasih-SM tanpa harus khawatir data hilang karena sistem keamanan yang menganggap Anda idle (tidak aktif).

## Kenapa Saya Butuh Ini?

Pernahkah Anda mengalami:
- Sedang mengisi form panjang di Fasih-SM, **lalu ke toilet sebentar** atau **membuka buku pedoman/KBLI/kalkulator**, tiba-tiba **semua data yang sudah diisi hilang begitu saja** tanpa peringatan?
- Sesi login tiba-tiba terputus padahal masih aktif bekerja?
- Data form tiba-tiba kosong dan harus input ulang dari awal?

**FasihSM Guard** menyelesaikan masalah ini dengan menjaga sesi Anda tetap aktif secara otomatis, sehingga data Anda aman - meskipun Anda sedang membuka file referensi atau istirahat sebentar.

## Cara Kerja (Sederhana)

Bayangkan Anda duduk di restoran dan tidak pesan apapun selama 5 menit. Pelayan akan datang dan bertanya "Apakah Anda masih di sini?"

FasihSM Guard bekerja seperti asisten yang duduk di meja sebelah Anda. Setiap 30 detik, asisten ini akan memberi tanda ke pelayan: "Kami masih di sini!" - sehingga Anda bisa fokus kerja tanpa diganggu.

## Cara Install

1. Download atau clone repository ini
2. Buka Chrome/Edge browser
3. Ketik di address bar: `chrome://extensions/`
4. Aktifkan **Developer mode** (toggle di kanan atas)
5. Klik **Load unpacked**
6. Pilih folder `fasihsm-guard` dari repository ini
7. Selesai! Ekstensi sudah aktif

## Cara Menggunakan

**Tidak perlu melakukan apapun!** Ekstensi bekerja otomatis setelah diinstall.

### Yang Akan Anda Lihat:

1. **Tab dengan Label "[Keep-Alive]"**
   - Ini adalah tab khusus yang dibuat ekstensi
   - Tab ini akan refresh sendiri setiap 30 detik
   - **Jangan ditutup** - biarkan tab ini terbuka

2. **Tab Kerja Anda Tetap Aman**
   - Tab yang Anda gunakan untuk bekerja **tidak akan** otomatis refresh
   - Data form yang Anda isi **tidak akan** hilang
   - Anda bisa bekerja dengan tenang

## Pertanyaan Umum

### Q: Kenapa ada tab baru yang muncul?
**A:** Tab dengan label "[Keep-Alive]" adalah tab khusus untuk menjaga sesi tetap aktif. Ini normal dan diperlukan agar ekstensi bekerja.

### Q: Boleh saya tutup tab "[Keep-Alive]"?
**A:** Boleh, tapi ekstensi akan membuat tab baru lagi. Lebih baik biarkan saja - tab ini tidak mengganggu pekerjaan Anda.

### Q: Apakah data saya aman?
**A:** Ya! Ekstensi **hanya** me-refresh tab "[Keep-Alive]", tidak pernah menyentuh tab kerja Anda. Data form Anda aman.

### Q: Berapa lama sesi saya tetap aktif?
**A:** Selama browser Anda terbuka dan ekstensi aktif, sesi akan terus dijaga. Tidak akan ada timeout atau challenge keamanan yang mengganggu.

### Q: Apakah menggunakan banyak memory?
**A:** Tab "[Keep-Alive]" menggunakan sekitar 50-100MB memory. Ini wajar dan tidak akan memperlambat komputer Anda.

### Q: Bagaimana cara mematikan ekstensi?
**A:** Buka `chrome://extensions/`, cari "FasihSM-Guard", dan matikan toggle di kanan. Tapi ingat: sesi Anda tidak akan dijaga lagi.

## Tips Penggunaan

✅ **LAKUKAN:**
- Biarkan tab "[Keep-Alive]" tetap terbuka
- Tutup tab "[Keep-Alive]" yang duplikat (kalau ada lebih dari satu)
- Lanjutkan bekerja seperti biasa di tab Anda

❌ **JANGAN:**
- Menutup semua tab Fasih-SM (termasuk tab Keep-Alive)
- Menonaktifkan ekstensi saat sedang bekerja
- Khawatir kalau tab "[Keep-Alive]" refresh sendiri - ini normal

## Troubleshooting

### Masalah: Sesi masih terputus
**Solusi:**
1. Pastikan ekstensi aktif di `chrome://extensions/`
2. Pastikan ada tab "[Keep-Alive]" yang terbuka
3. Reload extension: klik tombol refresh di `chrome://extensions/`

### Masalah: Tab "[Keep-Alive]" tidak muncul
**Solusi:**
1. Reload extension
2. Buka tab Fasih-SM baru secara manual
3. Wait 5 detik, tab "[Keep-Alive]" akan muncul

### Masalah: Terlalu banyak tab "[Keep-Alive]"
**Solusi:**
1. Tutup semua tab "[Keep-Alive]" yang duplikat
2. Reload extension
3. Biarkan hanya 1 tab "[Keep-Alive]" yang aktif

## Dukungan

Jika mengalami masalah atau punya pertanyaan:
1. Cek console di Developer Tools (F12) untuk error message
2. Pastikan versi ekstensi adalah yang terbaru (lihat di `chrome://extensions/`)
3. Hubungi developer atau buat issue di repository

## Changelog

**v1.8.1** (Current)
- Fix: Mencegah pembuatan tab baru berulang kali
- Improvement: Tracking tab lebih stabil

**v1.8**
- Fix Critical: Tab kerja user tidak akan pernah di-reload (data aman)
- Feature: Label "[Keep-Alive]" di tab untuk membedakan

**v1.7**
- ❌ Versi dengan bug - skip version ini

**v1.6**
- Feature: Hidden tab untuk keepalive
- Improvement: Tidak perlu Flask server

**v1.5 dan sebelumnya**
- Versi lama dengan berbagai pendekatan

## Lisensi

Ekstensi ini dibuat untuk memudahkan pekerjaan pegawai BPS dalam menggunakan aplikasi Fasih-SM.

---

**Selamat bekerja dengan tenang! 🛡️**
