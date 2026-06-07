SyNam NAM28 Provider Names + Hidden Chat Reply

Đã chỉnh:
- Hiện lại tên AI thật ở phần chọn AI/cài đặt: Gemini, Groq, OpenRouter, ChatGPT/OpenAI, Claude...
- Trong khung hội thoại trả lời vẫn giấu tên AI, chỉ hiện Sỹ Năm AI.
- API /api/multi-ai/chat vẫn trả label Sỹ Năm AI để không lộ tên con AI trong bong bóng chat.
- Tình duyên: thêm dữ liệu tuổi ageToday và ageGap do server tính, prompt cấm AI tự bịa tuổi/khoảng cách tuổi.

Ghi chú:
- Nếu muốn đổi tên hiển thị ở menu chọn AI: sửa label trong server.js và option trong public/index.html.
- Nếu AI trả lời sai số liệu, kiểm tra ngày sinh nhập theo định dạng yyyy-mm-dd và API provider đang dùng.
