#!/bin/bash

echo "🚀 Installing ferzcli - Powerful AI Coding Assistant"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16.0.0 or higher first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="16.0.0"

if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 16.0.0 or higher."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install dependencies
echo
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Make executable
chmod +x src/index.js

# Install globally (optional)
echo
read -p "🔗 Install ferzcli globally? (recommended) [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    npm link
    if [ $? -ne 0 ]; then
        echo
        echo "⚠️  Akses ditolak (Permission Denied). Mencoba dengan 'sudo'..."
        sudo npm link
        
        if [ $? -ne 0 ]; then
            echo "❌ Gagal menginstall secara global."
            echo "  Anda bisa menjalankan secara manual dengan: sudo ./install.sh"
            echo "  Atau gunakan secara lokal: node src/index.js"
        else
            echo "✅ ferzcli installed globally (with sudo)"
            echo
            echo "🎉 Installation complete!"
            echo
            echo "To get started:"
            echo "  1. ferzcli init    # Initialize with your Groq API key"
            echo "  2. ferzcli chat    # Start chatting with AI"
            echo "  3. ferzcli --help  # See all available commands"
            echo
            echo "For more information, see README.md"
        fi
    else
        echo "✅ ferzcli installed globally"
        echo
        echo "🎉 Installation complete!"
        echo
        echo "To get started:"
        echo "  1. ferzcli init    # Initialize with your Groq API key"
        echo "  2. ferzcli chat    # Start chatting with AI"
        echo "  3. ferzcli --help  # See all available commands"
        echo
        echo "For more information, see README.md"
    fi
else
    echo "✅ ferzcli installed locally"
    echo
    echo "🎉 Installation complete!"
    echo
    echo "To get started:"
    echo "  1. node src/index.js init    # Initialize with your Groq API key"
    echo "  2. node src/index.js chat    # Start chatting with AI"
    echo "  3. node src/index.js --help  # See all available commands"
    echo
    echo "For more information, see README.md"
fi
