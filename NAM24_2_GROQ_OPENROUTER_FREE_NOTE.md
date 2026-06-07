# NAM24_2_FAST_GROQ_OPENROUTER_FIX

Bản này được sửa trực tiếp từ: `SyNamMysticUltimatePro_NAM24_1_UX_REAL_FIX.zip`.

## Đã thêm

- Groq Free / siêu nhanh vào Multi-AI Router.
- OpenRouter Free Models vào Multi-AI Router.
- Chat Provider có thêm lựa chọn:
  - Groq Free/Nhanh
  - OpenRouter Free
- Auto Router ưu tiên Groq/OpenRouter khi muốn tốc độ và tiết kiệm.
- `.env.example` có sẵn:
  - `GROQ_API_KEY`
  - `GROQ_MODEL`
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL`

## Cách dùng nhanh

1. Lấy Groq key tại `console.groq.com` → API Keys.
2. Lấy OpenRouter key tại `openrouter.ai` → Keys.
3. Copy `.env.example` thành `.env`.
4. Dán key:

```env
GROQ_API_KEY=gsk_xxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile

OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxx
OPENROUTER_MODEL=deepseek/deepseek-r1:free
```

5. Chạy:

```bash
npm install
npm start
```

6. Mở app → tab `Multi AI` hoặc `AI Chat` → chọn Provider.

## Deploy Render

Vào Render → Environment Variables → thêm:

```env
GROQ_API_KEY=gsk_xxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OPENROUTER_MODEL=deepseek/deepseek-r1:free
DEFAULT_AI_PROVIDER=auto
```

Sau đó redeploy.

## Lưu ý

- Không dán API key vào file `public/app.js` hoặc frontend.
- Key nên để trong `.env` khi chạy local hoặc Environment Variables khi deploy Render.
- OpenRouter model có đuôi `:free` có thể bị giới hạn quota/ngày tùy tài khoản.
- Groq rất nhanh nhưng cũng có rate limit miễn phí.
