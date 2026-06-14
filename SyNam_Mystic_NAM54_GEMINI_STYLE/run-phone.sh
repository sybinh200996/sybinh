#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "📦 Đang cài thư viện lần đầu..."
  npm install
fi
if [ ! -f .env ]; then
  echo "⚠️ Chưa có file .env. Đang tạo từ .env.example"
  cp .env.example .env
  echo "👉 Hãy mở .env và thêm GEMINI_API_KEY trước khi dùng Gemini AI thật."
fi
echo "🚀 Đang chạy app tại: http://localhost:3000"
npm start
