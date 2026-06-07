NAM28.1 CAMERA + VOICE HOTFIX

Sửa đúng 2 lỗi Sỹ Năm báo:
1) Chụp ảnh trong AI Chat:
   - Nút Chụp ảnh gọi trực tiếp input camera ẩn, tránh lỗi label không mở camera trên Android.
   - Chụp/chọn ảnh xong tự gắn vào câu hỏi và hiện thumbnail ngay.
   - Ảnh lớn được tự nén về JPEG tối đa 1280px để tránh vượt giới hạn JSON/server.

2) Đọc câu hỏi bằng giọng nói:
   - Có chữ là đẩy nhanh vào box chat.
   - Khi Chrome báo câu cuối hoặc ngừng nói, app tự gửi nhanh hơn.
   - Không đợi quá lâu như bản trước.

Không sửa server.js để tránh làm hỏng AI đang chạy.
