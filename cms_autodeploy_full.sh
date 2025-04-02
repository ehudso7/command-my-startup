#!/bin/bash

set -e

echo "🌐 Starting Command My Startup Full AutoDeploy Setup..."

OS=$(uname -s)
ARCH=$(uname -m)
PYTHON_VERSION="3.11"

PYTHON_BIN="/opt/homebrew/bin/python${PYTHON_VERSION}"

# --- INSTALL HELPERS ---
install_python_mac() {
  echo "🐍 Installing Python $PYTHON_VERSION+ via Homebrew..."
  if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  brew install python@$PYTHON_VERSION
  echo "✅ Python installed at: $PYTHON_BIN"
}

install_node_mac() {
  echo "📦 Installing Node.js v20+ via Homebrew..."
  brew install node@20
  brew link --overwrite node@20
}

install_docker_mac() {
  echo "🐳 Docker must be manually installed on macOS due to GUI requirements:"
  echo "➡️ Visit: https://www.docker.com/products/docker-desktop/"
}

# --- INSTALL LOGIC ---
case "$OS" in
  Darwin)
    install_python_mac
    install_node_mac
    install_docker_mac
    ;;
  Linux)
    echo "🚧 Linux auto-setup not included here — use earlier version."
    exit 1
    ;;
  *)
    echo "❌ Unsupported OS: $OS"
    exit 1
    ;;
esac

# --- PROJECT SETUP ---
echo "📁 Bootstrapping backend..."

cd backend || { echo "❌ Missing backend/ directory"; exit 1; }

# Always use Python 3.11 from Homebrew
$PYTHON_BIN -m venv venv
source venv/bin/activate

pip install --upgrade pip wheel

# Fix requirement file
sed -i.bak 's/openai==1.15.0/openai==1.16.0/' requirements.txt || true

pip install -r requirements.txt

[ -f ".env" ] || cp .env.example .env

cd ..

echo "📁 Bootstrapping frontend..."

cd frontend || { echo "❌ Missing frontend/ directory"; exit 1; }

npm install

[ -f ".env.local" ] || cp .env.example .env.local

cd ..

echo "🎉 All components are installed and ready to run."

read -p "🚀 Would you like to start the backend and frontend now? (y/n): " start_now
if [[ "$start_now" =~ ^[Yy]$ ]]; then
  echo "🔌 Launching backend on port 8000..."
  (cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8001 &) > /dev/null
  echo "🔌 Launching frontend on port 3000..."
  (cd frontend && npm run dev &) > /dev/null
  sleep 3
  echo "🧪 Open:"
  echo "  → http://localhost:8001/docs (API)"
  echo "  → http://localhost:3000 (Frontend)"
else
  echo "✅ Setup complete. You're ready to launch:"
  echo "Backend: cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8001"
  echo "Frontend: cd frontend && npm run dev"
fi

