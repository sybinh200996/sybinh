# Deploy Namecheap cPanel Node.js App

## Cấu hình Node.js App

- Node.js version: 20.x
- Application mode: Production
- Application root: `synam`
- Application URL: domain hoặc subdomain muốn chạy
- Application startup file: `server.js`

## Upload file

Trong File Manager, upload source vào:

`/home/<username>/synam`

Bên trong thư mục `synam` phải thấy trực tiếp:

- `server.js`
- `package.json`
- `public/`
- `.env.example`
- `data/`

Không để bị lồng kiểu `synam/SyNamMystic.../server.js`.

## Environment Variables

Trong Setup Node.js App thêm:

- `GEMINI_API_KEY=API_KEY_CUA_BAN`
- `GEMINI_MODEL=gemini-2.5-flash`
- `GEMINI_IMAGE_MODEL=gemini-3.1-flash-image`

## Cài package

Bấm `Run NPM Install`, đợi xong rồi bấm `Restart`.

## Test

Mở:

- `https://domain-cua-ban/api/health`
- `https://domain-cua-ban/api/gemini-check`
- `https://domain-cua-ban/`

Nếu trang chính lỗi nhưng `/api/health` chạy, lỗi nằm ở frontend/public. Nếu `/api/health` không chạy, lỗi nằm ở Node app/Passenger/startup.
