# GitPro — Dev Environment Setup Script
# Run from repo root: .\dev.ps1

Write-Host "`n🚀 GitPro Dev Setup" -ForegroundColor Green
Write-Host "══════════════════════════════════════" -ForegroundColor DarkGray

# ── Check prerequisites ───────────────────────────────────────────────────────
function Check-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "❌ '$name' not found. Please install it first." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ $name found" -ForegroundColor Green
}

Write-Host "`n[1/4] Checking prerequisites..." -ForegroundColor Cyan
Check-Command "node"
Check-Command "npm"

$nodeVersion = node --version
Write-Host "  Node: $nodeVersion" -ForegroundColor DarkGray

# ── Backend setup ─────────────────────────────────────────────────────────────
Write-Host "`n[2/4] Setting up backend..." -ForegroundColor Cyan
Push-Location backend

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  ✓ Created backend/.env from .env.example" -ForegroundColor Green
    Write-Host "  ⚠  Edit backend/.env to add your DATABASE_URL, REDIS_URL, etc." -ForegroundColor Yellow
} else {
    Write-Host "  ✓ backend/.env already exists" -ForegroundColor Green
}

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing backend dependencies..." -ForegroundColor DarkGray
    npm install --silent
} else {
    Write-Host "  ✓ backend/node_modules exists (skipping install)" -ForegroundColor Green
}

Pop-Location

# ── Extension setup ───────────────────────────────────────────────────────────
Write-Host "`n[3/4] Setting up extension..." -ForegroundColor Cyan
Push-Location extension

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing extension dependencies..." -ForegroundColor DarkGray
    npm install --silent
} else {
    Write-Host "  ✓ extension/node_modules exists (skipping install)" -ForegroundColor Green
}

Write-Host "  Building extension..." -ForegroundColor DarkGray
npm run build --silent
Write-Host "  ✓ Extension built → extension/dist/" -ForegroundColor Green

Pop-Location

# ── Start instructions ────────────────────────────────────────────────────────
Write-Host "`n[4/4] Ready! 🎉" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Start backend:    " -NoNewline; Write-Host "cd backend && npm run dev" -ForegroundColor Yellow
Write-Host "  Mock dashboard:   " -NoNewline; Write-Host "http://localhost:3000/api/mock/dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Load extension in Chrome:" -ForegroundColor White
Write-Host "    1. Go to chrome://extensions" -ForegroundColor DarkGray
Write-Host "    2. Enable Developer Mode" -ForegroundColor DarkGray
Write-Host "    3. Load Unpacked → select the 'extension/' folder" -ForegroundColor DarkGray
Write-Host ""

# Ask if user wants to start backend now
$start = Read-Host "Start backend now? (y/n)"
if ($start -eq "y" -or $start -eq "Y") {
    Write-Host "`n🟢 Starting GitPro backend on http://localhost:3000 ..." -ForegroundColor Green
    Push-Location backend
    npm run dev
    Pop-Location
}
