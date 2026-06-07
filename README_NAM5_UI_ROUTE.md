# SyNam Mystic NAM5 UI Route

## Chạy app
```bash
npm install
npm start
```
Mở: http://localhost:3000

## Điểm mới
- Giao diện giống ảnh demo: xanh tím, neon, glassmorphism, banner có 2 ảnh.
- Tabs thu gọn, click từng mục chuyển sang trang riêng bằng route `/#/...`.
- Các trang: Tử vi, tình duyên, chỉ tay, xem tướng, chiêm tinh, phong thủy, bói bài, AI Chat, lịch sử, tài khoản.
- Giọng nói đọc kết quả bằng Web Speech API.
- Lưu lịch sử bằng localStorage.
- Giữ server API Gemini/OpenAI-style của bản NAM3.

## API key
Tạo file `.env` theo `.env.example`, thêm GEMINI_API_KEY rồi chạy lại server.
