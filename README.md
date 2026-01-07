# 🤖 Ferzcli Pro: Elite AI-Powered Coding Engine
> **Next-Gen CLI for Developers.** Transformasi Terminal Anda menjadi pusat kendali AI paling canggih, aman, dan berkinerja tinggi tanpa ketergantungan pada Node.js.

---

## 🌟 Fitur Unggulan (God-Mode)

### 🧠 Autonomous Agent Mode (`ferzcli agent`)
Bukan sekadar chat, ini adalah agen otonom yang bisa menganalisis kode, merancang rencana implementasi, dan mengeksekusi perubahan pada banyak file sekaligus secara cerdas.

### 🛡️ Hardening & Security Elit
- **Source Protection**: Seluruh logic utama diproteksi dengan obfuscation tingkat tinggi agar aman dari pembajakan.
- **Encrypted Global Config**: API Key Groq disimpan terenkripsi secara global di direktori user (`~/.ferzcli/`), bukan di folder project.
- **Security Sentinel**: Pemindaian otomatis terhadap celah keamanan (SQLi, XSS, Keys) sebelum kode diterapkan.

### 🚀 High-Performance Engine
- **Groq API Optimized**: Performa kilat dengan latensi ultra-rendah.
- **Real-Time Streaming**: Lihat AI menulis kode secara instan, baris demi baris.
- **Project Brain**: Pemahaman konteks project secara mendalam melalui indexing semantik otomatis.

---

## 💻 Instalasi & Setup

Ferzcli Pro didistribusikan sebagai **Standalone Binary**. Anda tidak perlu menginstal Node.js atau package manager tambahan di perangkat target.

### 1. Instalasi Otomatis (Sangat Direkomendasikan)
Gunakan installer otomatis kami untuk setup PATH dan konfigurasi instan:

- **Linux / MacOS (Bash):**
  ```bash
  curl -sSL https://raw.githubusercontent.com/FerzDevZ/ferzcli/main/scripts/install.sh | bash
  ```

- **Windows (PowerShell):**
  Jalankan script `scripts/install.ps1` dengan hak akses Administrator.

### 2. Instalasi Manual
Jika Anda lebih suka mengatur sendiri:
- Unduh binary terbaru dari [GitHub Releases](https://github.com/FerzDevZ/ferzcli/releases).
- Pindahkan ke folder sistem:
  - **Linux/Mac**: `/usr/local/bin/ferzcli` (pastikan `chmod +x`).
  - **Windows**: Tambahkan folder berisi `ferzcli-win.exe` ke Environment Variable `PATH` Anda.

---

## 🛠️ Panduan Penggunaan

Setelah terinstal, jalankan perintah ini untuk memulai:
```bash
ferzcli init
```
Masukkan API Key Groq Anda (Data akan otomatis dienkripsi untuk keamanan).

### Panduan Penggunaan Instan:
Jika Anda menggunakan versi build khusus saya, Anda tidak perlu mengisi API Key secara manual! Cukup jalankan:
```bash
ferzcli init --ferzapikey
```
Ini akan otomatis mengaktifkan ferzcli dengan konfigurasi elit yang sudah tertanam di dalamnya. 🛡️✨

### Perintah Utama:
| Perintah | Fungsi |
| :--- | :--- |
| `ferzcli agent` | Masuk ke Mode Agen Otonom (Fitur Utama) |
| `ferzcli chat` | Diskusi cepat dengan AI di terminal |
| `ferzcli commit` | AI otomatis membuat pesan commit cerdas berdasarkan diff kode |
| `ferzcli pulse` | Cek kesehatan project & deteksi tech-debt secara instan |
| `ferzcli info` | Melihat status sistem dan informasi project |

### Fitur di Dalam Agent Mode:
- **`refactor`**: Panduan langkah demi langkah untuk membersihkan kode.
- **`release`**: Otomatisasi changelog, tagging, dan versioning.
- **`logs`**: Monitor log aplikasi tanpa meninggalkan terminal agent.
- **`persona <name>`**: Sesuaikan gaya bahasa AI (Senior Architect, Bug Hunter, dll).

---

## 📦 Untuk Developer: Build & Build Ulang
Jika Anda memodifikasi source code dan ingin membangun binary baru:
1. Pastikan dependencies terpasang (`npm install`).
2. Jalankan perintah build:
   ```bash
   npm run build
   ```
3. Hasil binary akan muncul di `dist/bin/` dalam versi yang sudah ter-obfuscate.

---

## 👨‍💻 Dukungan
Dibuat dengan dedikasi tinggi oleh **FerzDevZ**.

- **GitHub:** [FerzDevZ](https://github.com/FerzDevZ)
- **Instagram:** [@ferzdevz](https://www.instagram.com/ferzdevz)
- **Website:** [ferzdevz.com](https://ferzdevz.com)

---
© 2026 FerzDevZ. Dilepaskan di bawah Lisensi MIT. Properti Intelektual Terlindungi.

##apikeyferz
####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
