#!/bin/bash
set -e

echo "=== Installing backend dependencies ==="
npm install

echo "=== Building frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Build completed successfully ==="
ls -la frontend/dist/ || echo "⚠️ Warning: frontend/dist not found"
