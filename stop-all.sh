#!/bin/bash

# Script to stop all InFlow services
set -e

BASE_DIR="/home/lviffy/Projects/onehack/InFlow"

echo "🛑 Stopping InFlow Services..."

# Stop Docker containers for AI_workflow_backend
echo "🐳 Stopping AI_workflow_backend..."
cd "$BASE_DIR/AI_workflow_backend"
sudo docker-compose down
echo "✅ AI_workflow_backend stopped"

# Stop Docker containers for n8n_agent_backend
echo "🐳 Stopping n8n_agent_backend..."
cd "$BASE_DIR/n8n_agent_backend"
sudo docker-compose down
echo "✅ n8n_agent_backend stopped"

# Kill backend and frontend Node processes
echo "📦 Stopping backend and frontend..."
pkill -f "npm start" || echo "No backend process found"
pkill -f "npm run dev" || echo "No frontend process found"
pkill -f "next dev" || echo "No Next.js process found"
echo "✅ Node processes stopped"

# ─── Clean DLT caches and unwanted files ────────────────────────────────────
echo "🧹 Cleaning caches and unwanted files..."

# Python caches across all backends
find "$BASE_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$BASE_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$BASE_DIR" -name "*.pyo" -delete 2>/dev/null || true
find "$BASE_DIR" -name "*.pyd" -delete 2>/dev/null || true

# Node / Next.js build & module caches
rm -rf "$BASE_DIR/frontend/.next/cache" 2>/dev/null || true
rm -f  "$BASE_DIR/frontend/tsconfig.tsbuildinfo" 2>/dev/null || true
rm -rf "$BASE_DIR/frontend/node_modules/.cache" 2>/dev/null || true
rm -rf "$BASE_DIR/backend/node_modules/.cache" 2>/dev/null || true

# Temp / log files
find "$BASE_DIR" -name "*.log" -delete 2>/dev/null || true
find "$BASE_DIR" -name "*.tmp" -delete 2>/dev/null || true
find "$BASE_DIR" -name ".DS_Store" -delete 2>/dev/null || true

echo "✅ Caches cleaned"
# ────────────────────────────────────────────────────────────────────────────

echo ""
echo "✨ All services stopped successfully!"
echo ""
