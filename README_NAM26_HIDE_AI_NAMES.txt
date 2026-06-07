Sỹ Năm NAM26 FIXED - ẨN TÊN AI

Bản này giữ giao diện NAM25 và đã chỉnh:
- Người dùng cuối chỉ thấy: Sỹ Năm AI, AI Chính, AI Nhanh, AI Dự phòng...
- Không hiện tên nhà cung cấp AI trên giao diện Chat.
- Không hiện tên model trong kết quả trả lời.
- /api/health và /api/models không công khai danh sách model.
- Chế độ So sánh nhiều AI chỉ hiện Phương án AI 1, 2, 3...

Lưu ý kỹ thuật:
- Trong server.js vẫn bắt buộc có cấu hình nội bộ để gọi API thật.
- File server.js không nằm trong thư mục public nên người dùng web bình thường không xem được.
- Không đưa file .env hoặc API key lên public_html/GitHub công khai.

Cách chạy:
1. npm install
2. Tạo file .env và thêm API key bạn có.
3. npm start
4. Mở http://localhost:3000
