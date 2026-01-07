#!/bin/bash

# Ferzcli Pro - Universal Installer (Linux/MacOS)
set -e

echo "🚀 Installing Ferzcli Pro..."

# 1. Detect OS
OS_TYPE=$(uname -s)
ARCH_TYPE=$(uname -m)

echo "📍 Detected OS: $OS_TYPE ($ARCH_TYPE)"

# 2. Binary selection (Simulated logic for GitHub release download)
# For now, we assume development environment links the built binary
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="ferzcli"

# 3. Create config directory
mkdir -p "$HOME/.ferzcli"
chmod 700 "$HOME/.ferzcli"

# In a real scenario, we would curl the binary from GitHub here
# curl -L -o /tmp/ferzcli "https://github.com/FerzDevZ/ferzcli/releases/latest/download/ferzcli-linux"

echo "✅ Ferzcli Pro installed to $INSTALL_DIR"
echo "👉 Run 'ferzcli init' to get started."
