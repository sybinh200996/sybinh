# Deploy Render - SyNam Mystic Phoenix

1. Đẩy toàn bộ thư mục này lên GitHub.
2. Vào Render -> New -> Web Service -> chọn repo.
3. Điền:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Node version: 20
4. Environment Variables:
   - `GEMINI_API_KEY=API_KEY_CUA_BAN`
   - `GEMINI_MODEL=gemini-2.5-flash`
   - `GEMINI_IMAGE_MODEL=gemini-3.1-flash-image`
5. Deploy.
6. Test:
   - `/api/health`
   - `/api/gemini-check`

Lưu ý: Không upload `node_modules`, không dùng `latest`, không giữ package-lock cũ nếu đổi dependency.
