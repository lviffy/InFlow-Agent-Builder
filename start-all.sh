#!/bin/bash

# Script to start all InFlow services
set -e

BASE_DIR="/home/lviffy/Projects/onehack/blockops"

echo "🚀 Starting InFlow Services..."

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

# Start backend with npm start
echo "📦 Starting backend..."
cd "$BASE_DIR/backend"
npm start &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait a bit for backend to initialize
sleep 3

# Start AI_workflow_backend with docker compose
echo "🐳 Starting AI_workflow_backend..."
cd "$BASE_DIR/AI_workflow_backend"
sudo docker-compose down
sudo docker-compose up -d
echo "✅ AI_workflow_backend started"

# Start n8n_agent_backend with docker compose
echo "🐳 Starting n8n_agent_backend..."
cd "$BASE_DIR/n8n_agent_backend"
sudo docker-compose down
sudo docker-compose up -d
echo "✅ n8n_agent_backend started"

# Start frontend with npm run dev
echo "⚛️  Starting frontend..."
cd "$BASE_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "✨ All services started successfully!"
echo ""
echo "Service URLs (typical):"
echo "  Backend:     http://localhost:3001"
echo "  Frontend:    http://localhost:3000"
echo "  AI Workflow: http://localhost:8001"
echo "  N8N Agent:   http://localhost:8000"
echo ""
echo "To stop all services, run: ./stop-all.sh"
echo ""
