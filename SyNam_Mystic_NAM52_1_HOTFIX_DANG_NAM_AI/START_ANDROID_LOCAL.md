# Chạy SyNam Mystic local trên điện thoại Android

Bản này chạy được trực tiếp trên điện thoại bằng **Termux**.

## 1) Cài Termux
- Cài Termux từ F-Droid nếu có thể.
- Mở Termux và chạy:

```bash
pkg update -y
pkg install nodejs-lts unzip nano -y
```

## 2) Giải nén app
Ví dụ file zip nằm trong thư mục Download:

```bash
cd /sdcard/Download
unzip SyNamMysticUltimatePro_NAM13_ANDROID_LOCAL.zip
cd SyNamMysticUltimatePro_NAM13_ANDROID_LOCAL/nam7
```

Nếu Termux chưa có quyền đọc bộ nhớ, chạy:

```bash
termux-setup-storage
```

## 3) Thêm Gemini API key
Tạo file `.env`:

```bash
cp .env.example .env
nano .env
```

Điền:

```env
GEMINI_API_KEY=AIzaSy_xxxxxxxxxxxxxxxxx
PORT=3000
```

Lưu nano: nhấn `CTRL + O` → Enter → `CTRL + X`.

## 4) Cài thư viện và chạy

```bash
npm install
npm start
```

Mở trình duyệt trên điện thoại:

```txt
http://localhost:3000
```

## 5) Mở từ máy khác trong cùng Wi-Fi
Trong Termux chạy:

```bash
ip addr show wlan0
```

Tìm IP dạng `192.168.x.x`, rồi mở trên máy khác:

```txt
http://192.168.x.x:3000
```

## Ghi chú
- Không có `node_modules` trong zip, nên lần đầu phải chạy `npm install`.
- Gemini chỉ hoạt động khi `.env` có `GEMINI_API_KEY` đúng.
- Upload ảnh/file cần trình duyệt cấp quyền chọn file.
