SyNam NAM28 STABLE AI CHAT FIX

Nền: quay lại NAM27 đang chạy được.

Sửa tối thiểu, không phá luồng AI:
- Giữ nguyên server.js và app.js logic AI của NAM27.
- Đổi ô chat từ input thành textarea rộng hơn, tự giãn dòng.
- Enter gửi, Shift+Enter xuống dòng.
- Voice nói xong tự gửi như NAM27.
- Camera/Upload vẫn dùng handleChatFiles gốc của NAM27, thêm reset input để Android chọn/chụp lại ảnh được.
- Hiển thị thumbnail ảnh đã chọn/chụp.

Bản này ưu tiên: AI phải chạy trước, UI chat cải thiện sau.
