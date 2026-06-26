#!/usr/bin/env bash
# =============================================================
# Daycare Routine Tracker — Local Development Setup Script
# Run: bash scripts/setup.sh
# =============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Daycare Routine Tracker — Setup${NC}"
echo -e "${BLUE}  FirstCry Intellitots, June 2026${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check prerequisites
info "Checking prerequisites..."
command -v node  >/dev/null 2>&1 || error "Node.js not found. Install from https://nodejs.org (v20+)"
command -v npm   >/dev/null 2>&1 || error "npm not found."
command -v psql  >/dev/null 2>&1 || warn "psql not found — ensure PostgreSQL is installed."

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 18+ required. Found: $(node -v)"
fi
success "Node.js $(node -v) — OK"

# Backend setup
info "Installing backend dependencies..."
cd backend
npm install
success "Backend dependencies installed"

# Copy .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from .env.example — please update with your values before running."
else
  info ".env already exists — skipping copy"
fi
cd ..

# Frontend setup
info "Installing frontend dependencies..."
cd frontend
npm install
success "Frontend dependencies installed"

if [ ! -f .env ]; then
  echo "VITE_API_BASE_URL=http://localhost:5000/api" > .env
  echo "VITE_APP_NAME=Daycare Routine Tracker"      >> .env
  success "frontend/.env created"
fi
cd ..

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit backend/.env and set your PostgreSQL credentials + JWT secrets"
echo ""
echo "  2. Create the database:"
echo "     createdb daycare_tracker"
echo ""
echo "  3. Run migrations:"
echo "     cd backend && npm run db:migrate"
echo ""
echo "  4. Seed sample data:"
echo "     cd backend && npm run db:seed"
echo ""
echo "  5. Start the backend (Terminal 1):"
echo "     cd backend && npm run dev"
echo ""
echo "  6. Start the frontend (Terminal 2):"
echo "     cd frontend && npm run dev"
echo ""
echo "  App:    http://localhost:5173"
echo "  API:    http://localhost:5000/api"
echo "  Health: http://localhost:5000/health"
echo ""
echo "  Demo login: admin@intellitots.com / Admin@123"
echo ""
