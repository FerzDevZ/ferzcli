# Panduan Penggunaan Ferzcli

Selamat! Ferzcli adalah asisten coding AI yang siap membantu Anda 24/7. Berikut adalah cara menggunakan fitur-fitur utamanya.

## 1. Instalasi (Jika Gagal)
Jika Anda melihat error `EACCES` atau `permission denied` saat install, cukup jalankan ulang installer, script sekarang akan otomatis meminta password `sudo` jika diperlukan:
```bash
./install.sh
# Masukkan password jika diminta
```

## 2. Fitur Utama

### A. 🤖 Super Agent & Universal Mode (Fitur Paling Canggih)
Jika Anda malas mengetik command atau bingung, gunakan ini. Agent ini bisa melakukan APAPUN (membuat file, memperbaiki error, menambah fitur) hanya dengan bahasa manusia.

**Cara Pakai:**
1. Jalankan `ferzcli` -> Pilih **Super Agent - Natural Language AI**.
2. Ketik perintah Anda, contoh:
   - *"Buatkan file Python untuk scraping data saham"*
   - *"Analisis folder ini dan perbaiki bug yang ada"*
   - *"Buatkan struktur project Next.js lengkap"*

### B. ✨ Code Autocomplete
Fitur ini membantu Anda melengkapi kode atau memberikan saran implementasi.

**Cara Pakai:**
1. Jalankan `ferzcli autocomplete` (atau pilih dari menu).
2. Pilih file yang ingin di-complete.
3. Tulis instruksi singkat, misal: *"Tambahkan fungsi login validation"*.
4. AI akan menuliskan kodenya untuk Anda.

### C. 🩺 System Doctor (Otomatis)
Setiap kali Anda menjalankan Super Agent, Ferzcli otomatis mengecek kesehatan sistem Anda (NodeJS, PHP, Git, dll) dan memberi saran jika ada tool yang kurang.

### D. 🏗️ Laravel Specialist
Khusus pengguna Laravel, ini adalah tool wajib.
- **Audit**: `ferzcli laravel audit` (Mencari celah keamanan & bug).
- **Optimize**: `ferzcli laravel optimize` (Auto-config cache & route).

## 3. Pertolongan Pertama (Troubleshooting)
Jika ada error atau bug:
- **Debug**: Jalankan `ferzcli chat` dan paste error log Anda. AI akan menganalisis penyebabnya.
- **Auto Repair**: Pilih menu **Auto Code Repair** untuk membiarkan AI mencoba memperbaiki file secara otomatis.

Selamat berkarya dengan Ferzcli! 🚀
