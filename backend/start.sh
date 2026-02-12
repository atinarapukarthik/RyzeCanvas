#!/bin/bash

echo "========================================"
echo " RyzeCanvas Backend - Quick Start"
echo "========================================"
echo ""

echo "[1/4] Creating virtual environment..."
python3 -m venv venv

echo ""
echo "[2/4] Activating virtual environment..."
source venv/bin/activate

echo ""
echo "[3/4] Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "[4/4] Starting the backend server..."
echo ""
echo "========================================"
echo " Server will start at http://localhost:8000"
echo " API Docs: http://localhost:8000/docs"
echo " Default Admin: admin@ryze.ai / admin123"
echo "========================================"
echo ""

python -m app.main
