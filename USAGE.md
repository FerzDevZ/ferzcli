# 🚀 ferzcli - Panduan Lengkap Penggunaan

## ⚡ Instalasi & Setup

### Langkah 1: Setup PATH (PENTING!)
```bash
# Tambahkan ke .bashrc atau .zshrc Anda
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Reload terminal atau jalankan:
source ~/.bashrc
```

### Langkah 2: Verifikasi Instalasi
```bash
ferzcli --version
# Output: 1.0.0

ferzcli --help
# Menampilkan semua command yang tersedia
```

## 🎯 Command Lengkap ferzcli

### 🤖 Chat Interaktif
```bash
# Mulai chat dengan AI
ferzcli chat

# Chat dengan context file
ferzcli chat --context src/app.js

# Chat dengan context direktori
ferzcli chat --context ./src

# Gunakan model spesifik
ferzcli chat --model llama-3.3-70b-versatile
```

**Perintah dalam Chat:**
- `exit` atau `quit` - Keluar dari chat
- `clear` - Hapus history chat
- `help` - Tampilkan bantuan
- `history` - Lihat history chat
- `save <filename>` - Simpan chat ke file

### ✨ Autocomplete Canggih
```bash
# Autocomplete function
ferzcli autocomplete "function calculateTotal"

# Dengan bahasa spesifik
ferzcli autocomplete "def fibonacci" --language python

# Dengan context tambahan
ferzcli autocomplete "app.get" --context "Express.js REST API"
```

### 📋 Planning & Task Management
```bash
# Generate development plan
ferzcli plan "Build user authentication system"

# Dengan kompleksitas spesifik
ferzcli plan "Migrate to React" --complexity complex --tech "React, TypeScript"

# Dengan timeframe
ferzcli plan "Create API documentation" --complexity simple
```

### 🔍 Analisis Kodebase
```bash
# Analisis direktori saat ini
ferzcli analyze .

# Analisis file spesifik
ferzcli analyze src/components/Button.js

# Output dalam format JSON
ferzcli analyze . --format json

# Dengan depth analisis
ferzcli analyze . --depth 5
```

### ⚙️ Konfigurasi
```bash
# Lihat semua konfigurasi
ferzcli config --list

# Set model default
ferzcli config --set defaultModel llama-3.3-70b-versatile

# Set temperature (creativity level)
ferzcli config --set temperature 0.7

# Set max tokens
ferzcli config --set maxTokens 8192

# Konfigurasi interaktif
ferzcli config
```

## 🎨 Model AI yang Direkomendasikan

| Model | Digunakan untuk | Kelebihan |
|-------|----------------|-----------|
| `llama-3.3-70b-versatile` | General coding, planning | Balance terbaik |
| `llama-3.1-8b-instant` | Autocomplete, fast responses | Cepat & akurat |
| `llama-3.3-70b-versatile` | Complex planning, analysis | Powerful & detail |

## 💡 Tips Penggunaan

### 1. **Autocomplete yang Powerful**
```bash
# Lebih baik dengan context
ferzcli autocomplete "useState" --context "React component"

# Gunakan untuk berbagai bahasa
ferzcli autocomplete "public class" --language java
```

### 2. **Planning yang Detail**
```bash
# Sertakan teknologi stack
ferzcli plan "Build e-commerce API" --tech "Node.js, Express, MongoDB"

# Tentukan kompleksitas
ferzcli plan "Add dark mode" --complexity simple
```

### 3. **Chat dengan Context**
```bash
# Bawa seluruh project sebagai context
ferzcli chat --context .

# Atau file spesifik
ferzcli chat --context package.json
```

## 🔧 Troubleshooting

### Command tidak ditemukan
```bash
# Pastikan PATH sudah benar
echo $PATH
export PATH="$HOME/.local/bin:$PATH"

# Test dengan full path
~/.local/bin/ferzcli --help
```

### API Error
```bash
# Check konfigurasi
ferzcli config --list

# Re-init jika perlu
ferzcli init
```

### Model tidak tersedia
```bash
# Update ke model yang valid
ferzcli config --set defaultModel llama-3.3-70b-versatile
```

## 🌟 Fitur Unggulan vs Cursor

| Fitur | ferzcli | Cursor |
|-------|---------|--------|
| **Context Awareness** | ✅ Full project | ⚠️ Limited |
| **Planning Intelligence** | ✅ Advanced timeline | ❌ None |
| **Universal File Support** | ✅ All file types | ⚠️ Code only |
| **Terminal Native** | ✅ Fast & efficient | ❌ GUI heavy |
| **Custom AI Models** | ✅ Multiple optimized | ⚠️ Limited |
| **Cost Effective** | ✅ Groq API | ❌ Proprietary |

## 🎉 Contoh Workflow Lengkap

```bash
# 1. Setup (sekali saja)
export PATH="$HOME/.local/bin:$PATH"

# 2. Mulai dengan planning
ferzcli plan "Build React dashboard with API integration"

# 3. Analisis struktur project
ferzcli analyze .

# 4. Chat untuk brainstorming
ferzcli chat --context .

# 5. Autocomplete saat coding
ferzcli autocomplete "const fetchData = async"

# 6. Review code dengan AI
ferzcli chat --context src/components/Dashboard.js
```

## 📞 Support & Bantuan

Jika ada masalah:
1. Check `ferzcli --help`
2. Lihat `ferzcli config --list`
3. Test dengan `ferzcli chat` untuk basic functionality
4. Lihat README.md untuk dokumentasi lengkap

---

**🎯 ferzcli siap digunakan! Lebih powerful dari Cursor dengan kemampuan AI yang advanced!**
