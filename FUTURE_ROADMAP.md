# Ferzcli: Future Optimization & Feature Roadmap

Dokumen ini merinci strategi teknis untuk mengatasi keterbatasan `ferzcli` saat ini dan rencana pengembangan fitur masa depan agar menjadi Assistant AI kelas dunia.

## 🚀 Strategi Optimasi (Addressing Limitations)

### 1. Masalah: Context Window & Large Projects
**Solusi: RAG (Retrieval-Augmented Generation) Lite**
Alih-alih mengirim *seluruh* file ke AI (yang boros token), kita akan membangun sistem indeks cerdas.
*   **Mekanisme**: Saat init, ferzcli akan membuat index map (`.ferz/index.json`) yang berisi *summary* dari setiap fungsi/class.
*   **Cara Kerja**: Saat Anda bertanya "Fix bug login", AI hanya akan mengambil file `AuthController.php` dan `User.php` berdasarkan index, bukan seluruh folder `app/`.
*   **Target**: Mendukung proyek dengan 1000+ file dengan cepat.

### 2. Fokus: Lightweight & Cloud-First (Sesuai Permintaan)
**Solusi: Optimized Cloud Processing**
Ferzcli akan tetap **100% Online** agar tidak membebani RAM/CPU laptop pengguna.
*   **Filosofi**: "Otak di Cloud, Tangan di Terminal". Laptop user hanya menerima instruksi ringan, sementara proses berpikir berat (reasoning) dilakukan di server API.
*   **Strategi Hemat Kuota**: Implementasi *Smart Compression* sebelum mengirim prompt, agar respons cepat dan hemat data internet.

### 3. Masalah: Tidak Ada "Memori"
**Solusi: Project & Global Memory System**
*   **`.ferzrc` (Global)**: Menyimpan preferensi coding style user (misal: "Selalu gunakan arrow function", "Gunakan Tailwind").
*   **`.ferz/history.json` (Local)**: AI mengingat konteks percakapan sebelumnya dalam proyek yang sama, sehingga tidak perlu dijelaskan ulang.

---

## 🌟 Saran Fitur Tambahan (New Features)

### 1. Multi-Language Specialists (Polyglot)
Saat ini Ferzcli sangat jago Laravel. Kita akan menambah "Specialist Classes" baru:
*   **React/Next.js Specialist**: Paham *Hooks, Server Actions, Hydration*.
*   **Python/Data Specialist**: Paham *Pandas, PyTorch, FastApi*.
*   **DevOps Specialist**: Otomatis generate *Docker-compose, CI/CD Pipeline, Nginx config*.

### 2. "Ghost Writer" (Real-time Watcher)
Mode di mana Ferzcli berjalan di background (seperti `npm run watch`).
*   **Fungsi**: Jika Anda menyimpan file dengan *syntax error*, Ferzcli otomatis mendeteksi dan menawarkan perbaikan via notifikasi terminal tanpa Anda harus menjalankan command.

### 3. Smart Git Assistant
*   **Fungsi**: Tidak perlu bingung nulis commit message.
*   **Cara Kerja**: `ferzcli git commit` -> AI membaca perubahan file (`git diff`) -> otomatis membuat pesan commit yang deskriptif dan profesional.

### 4. Auto-Test Generator (TDD Booster)
*   **Konsep**: "Buatkan tes untuk file ini".
*   **Fungsi**: AI menganalisis logic kode Anda, lalu otomatis membuat file Unit Test (PHPUnit/Jest) lengkap dengan edge cases. Sangat berguna untuk mengejar "Zero Bug".

### 5. API Integration Wizard (3rd Party)
*   **Konsep**: Mempercepat integrasi layanan luar.
*   **Fungsi**: Cukup ketik "Integrasi Stripe Payment", Ferzcli akan meng-generate Controller, Route, dan Service class standar untuk Stripe, lengkap dengan error handling.

### 6. Code Tutor Mode (Learning)
*   **Fungsi**: Penjelasan kode interaktif.
*   **Cara Kerja**: Sorot file yang rumit, lalu minta penjelasan. AI akan memberikan komentar baris-per-baris tentang apa yang kode itu lakukan. Cocok untuk junior dev atau saat handover project.

## 📅 Rencana Implementasi Bertahap

| Phase | Fokus | Estimasi Fitur |
| :--- | :--- | :--- |
| **v1.1** | **Memory & Config** | Global Config `.ferzrc`, Style Preferences |
| **v1.2** | **Smart Cloud** | RAG Lite Indexing (Hemat Token & Cepat) |
| **v1.3** | **Polyglot** | React/Python Specialist Support |
| **v2.0** | **Cloud Dashboard** | Web UI ringan untuk visualisasi project |

---
*Roadmap ini dirancang untuk menjaga ferzcli tetap ringan (lightweight) namun semakin powerful seiring waktu.*
