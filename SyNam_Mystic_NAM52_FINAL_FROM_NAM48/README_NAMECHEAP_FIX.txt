SYNAM NAMECHEAP FIX FINAL

Cach up len Namecheap:

1. Upload va ghi de 2 file:
   - server.js
   - package.json

2. Xoa neu co:
   - package-lock.json
   - node_modules

3. Vao Setup Node.js App:
   - Node version: 20.x
   - Startup file: server.js

4. Bam Run NPM Install

5. Bam Restart

6. Test:
   https://synam.online/api/health
   https://synam.online/api/models

Cac loi da fix:
- Bo app.listen(PORT, "0.0.0.0") de hop voi Phusion Passenger/cPanel.
- Them facePart vao destructuring de tranh ReferenceError trong /api/vision-ai.
- Bo latest trong package.json, dung version co dinh.
- Them engines node 20.x.
