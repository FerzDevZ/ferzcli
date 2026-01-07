#!/bin/bash

echo "🚀 Menginstall ferzcli - AI Coding Assistant"
echo "=========================================="

# Cek Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js tidak ditemukan. Install Node.js 16+ terlebih dahulu."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
if ! [ "$(printf '%s\n' "16.0.0" "$NODE_VERSION" | sort -V | head -n1)" = "16.0.0" ]; then
    echo "❌ Node.js version $NODE_VERSION tidak didukung. Upgrade ke 16.0.0+"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION terdeteksi"

# Install dependencies
echo
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Gagal install dependencies"
    exit 1
fi

# Setup executable
echo
echo "⚙️  Setting up ferzcli executable..."

mkdir -p ~/.local/bin

cat > ~/.local/bin/ferzcli << 'EOF'
#!/bin/bash
cd /home/ferdinand/ferzcli
exec node src/index.js "$@"
EOF

chmod +x ~/.local/bin/ferzcli

# Setup PATH
echo
echo "🔗 Setting up PATH..."

if ! grep -q "$HOME/.local/bin" ~/.bashrc; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    echo "✅ PATH ditambahkan ke ~/.bashrc"
else
    echo "✅ PATH sudah ada di ~/.bashrc"
fi

# Setup alias
if ! grep -q "alias ferzcli=" ~/.bashrc; then
    echo "alias ferzcli='~/.local/bin/ferzcli'" >> ~/.bashrc
    echo "✅ Alias ferzcli ditambahkan"
fi

# Reload bashrc
source ~/.bashrc

# Test installation
echo
echo "🧪 Testing installation..."
if ferzcli --version &> /dev/null; then
    echo "✅ ferzcli berhasil diinstall!"
    echo
    echo "🎯 Cara penggunaan:"
    echo "   ferzcli --help           # Lihat semua command"
    echo "   ferzcli chat             # Chat dengan AI"
    echo "   ferzcli autocomplete 'function' # Code completion"
    echo "   ferzcli plan 'build app' # Generate development plan"
    echo "   ferzcli analyze .        # Analyze project"
    echo
    echo "📚 Dokumentasi lengkap: lihat USAGE.md"
else
    echo "❌ Ada masalah dengan instalasi"
    echo "Coba jalankan: source ~/.bashrc"
    exit 1
fi

echo
echo "🎉 ferzcli siap digunakan! Lebih powerful dari Cursor! 🚀"
