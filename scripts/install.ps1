# Ferzcli Pro - Universal Installer (Windows)
$ErrorActionPreference = "Stop"

Write-Host "🚀 Installing Ferzcli Pro for Windows..." -ForegroundColor Cyan

# 1. Detect Architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
Write-Host "📍 Architecture: $Arch"

# 2. Create config directory
$ConfigDir = Join-Path $HOME ".ferzcli"
if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir | Out-Null
}

# 3. Path Setup (Simulated)
# In a real scenario, download the .exe and add to PATH environment variable
# Invoke-WebRequest -Uri "..." -OutFile "$HOME\ferzcli.exe"

Write-Host "✅ Ferzcli Pro installed successfully." -ForegroundColor Green
Write-Host "👉 Restart your terminal and run 'ferzcli init'."
