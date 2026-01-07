# 🚀 ferzcli - Quick Start Guide

## ✅ Instalasi Selesai!

ferzcli sudah berhasil diinstall dan dikonfigurasi. Berikut panduan cepat penggunaan:

## 🎯 Command Utama

### Test Instalasi
```bash
# Verifikasi instalasi
ferzcli --version
# Output: 1.0.0

ferzcli --help
# Tampilkan semua command
```

### Fitur Unggulan

#### 🤖 Chat dengan AI
```bash
ferzcli chat
# Mulai chat interaktif dengan AI

ferzcli chat --context src/
# Chat dengan context dari direktori src

ferzcli chat --context package.json
# Chat dengan context dari file tertentu
```

#### ✨ Autocomplete Canggih
```bash
ferzcli autocomplete "function calculateTotal"
# Generate multiple code completion suggestions

ferzcli autocomplete "app.get" --language javascript
# Dengan bahasa spesifik

ferzcli autocomplete "def fibonacci" --language python
# Untuk Python
```

#### 📋 Planning & Development
```bash
ferzcli plan "Build user authentication system"
# Generate development plan detail

ferzcli plan "Migrate to React" --complexity complex --tech "React,TypeScript"
# Dengan spesifikasi teknis
```

#### 🔍 Analisis Kodebase
```bash
ferzcli analyze .
# Analisis direktori saat ini

ferzcli analyze src/components/Button.js
# Analisis file spesifik

ferzcli analyze . --format json
# Output dalam format JSON
```

#### ⚙️ Konfigurasi
```bash
ferzcli config --list
# Lihat semua konfigurasi

ferzcli config --set temperature=0.7
# Ubah temperature

ferzcli config --set defaultModel=llama-3.3-70b-versatile
# Ubah model default
```

## 🌟 Keunggulan ferzcli vs Cursor

| Fitur | ferzcli | Cursor |
|-------|---------|--------|
| **Context Awareness** | ✅ Full project | ⚠️ Limited |
| **Planning Intelligence** | ✅ Timeline & dependencies | ❌ None |
| **Universal File Support** | ✅ All file types | ⚠️ Code only |
| **Terminal Native** | ✅ Fast & efficient | ❌ GUI heavy |
| **Cost Effective** | ✅ Groq API | ❌ Proprietary |

## 📋 Tips Penggunaan

### 1. **Context adalah Kunci**
```bash
# Lebih baik dengan context
ferzcli chat --context .
# AI akan memahami seluruh project Anda
```

### 2. **Planning Sebelum Coding**
```bash
ferzcli plan "build e-commerce API" --tech "Node.js,Express,MongoDB"
# Dapatkan roadmap development yang jelas
```

### 3. **Autocomplete dengan Context**
```bash
cd project-folder
ferzcli autocomplete "router." --context "Express.js API"
# Suggestions yang lebih relevan
```

## 🔧 Troubleshooting

### Command tidak ditemukan
```bash
# Pastikan PATH sudah benar
echo $PATH

# Reload terminal
source ~/.bashrc

# Atau set manual
export PATH="$HOME/.local/bin:$PATH"
```

### API Error
```bash
# Check API key
ferzcli config --list

# Re-init jika perlu
ferzcli init
```

## 🎉 Mulai Menggunakan!

ferzcli siap digunakan untuk meningkatkan produktivitas coding Anda. Lebih powerful dari Cursor dengan kemampuan AI yang advanced!

---

**🚀 Happy Coding with ferzcli!**
