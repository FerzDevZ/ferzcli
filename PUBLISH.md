# 📦 Panduan Publikasi Ferzcli Pro

File ini berisi panduan untuk merilis versi baru Ferzcli ke GitHub dan NPM secara aman.

## 1. Persiapan Build (Wajib)
Selalu jalankan build sebelum rilis untuk memastikan kode sudah di-obfuscate:
```bash
npm run build
```

## 2. Publikasi ke NPM
Karena keamanan NPM sekarang sangat ketat, Anda memerlukan Two-Factor Authentication (2FA):

1. Jalankan perintah publish:
   ```bash
   npm publish
   ```
2. Jika diminta **OTP (One-Time Password)**, masukkan kode dari aplikasi Authenticator Anda (Google Authenticator/Authy).
3. Jika gagal dengan error 2FA, gunakan:
   ```bash
   npm publish --otp=KODE_ANDA
   ```

## 3. Publikasi ke GitHub (Releases)
Untuk mendistribusikan binary (`.exe` dan Linux):

1. Push update ke GitHub:
   ```bash
   git add .
   git commit -m "chore: version bump [versi]"
   git push origin main
   ```
2. Buka repo GitHub Anda -> **Releases** -> **Draft a new release**.
3. Upload file dari `dist/bin/`:
   - `ferzcli-linux`
   - `ferzcli-win.exe`
4. Publish Release!

## ⚠️ Peringatan Keamanan
- **JANGAN PERNAH** menghapus `.gitignore` atau `.npmignore`. Mereka menjaga kode sumber asli dan API Key Anda tetap rahasia.
- Jika Anda menambah file rahasia baru, segera tambahkan ke `.gitignore`.

---
© 2026 FerzDevZ. Securely Built by Antigravity.
