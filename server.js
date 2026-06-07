import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

process.on("uncaughtException", err => {
  console.error("UNCAUGHT_EXCEPTION:", err);
});
process.on("unhandledRejection", err => {
  console.error("UNHANDLED_REJECTION:", err);
});

app.use(cors());
app.use(express.json({ limit: "22mb" }));
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

async function ensureDataStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]\n", "utf8");
  }
  try {
    await fs.access(SESSIONS_FILE);
  } catch {
    await fs.writeFile(SESSIONS_FILE, "{}\n", "utf8");
  }
}

async function readUsers() {
  await ensureDataStore();
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Không đọc được users.json:", error);
    return [];
  }
}

async function writeUsers(users) {
  await ensureDataStore();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function readSessions() {
  await ensureDataStore();
  try {
    const raw = await fs.readFile(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error("Không đọc được sessions.json:", error);
    return {};
  }
}

async function writeSessions(sessions) {
  await ensureDataStore();
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
}

async function createSession(userId, provider = "password") {
  const sessions = await readSessions();
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = {
    userId,
    provider,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString()
  };
  await writeSessions(sessions);
  return token;
}

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function currentUserFromRequest(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const sessions = await readSessions();
  const session = sessions[token];
  if (!session) return null;
  session.lastSeenAt = new Date().toISOString();
  await writeSessions(sessions);
  const users = await readUsers();
  return users.find(u => u.id === session.userId) || null;
}

async function destroySession(req) {
  const token = getBearerToken(req);
  if (!token) return;
  const sessions = await readSessions();
  delete sessions[token];
  await writeSessions(sessions);
}

function firebaseConfigFromEnv() {
  return {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    appId: process.env.FIREBASE_APP_ID || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ""
  };
}

function isFirebaseConfigured() {
  const cfg = firebaseConfigFromEnv();
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored = "") {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(String(password), salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), check);
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, plan: user.plan || "Free", avatar: user.avatar || "", providers: user.providers || [], createdAt: user.createdAt };
}


const AI_PROVIDERS = {
  gemini: {
    label: "AI Chính",
    keyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite"],
    freeHint: "Chế độ AI chính, dùng cho hỏi đáp và phân tích nội dung."
  },
  groq: {
    label: "AI Nhanh",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "mixtral-8x7b-32768"],
    freeHint: "Chế độ phản hồi nhanh, phù hợp câu hỏi ngắn và lập trình."
  },
  openrouter: {
    label: "AI Dự phòng",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "openrouter/free",
    models: ["openrouter/free", "deepseek/deepseek-r1:free", "deepseek/deepseek-chat-v3-0324:free", "qwen/qwen3-235b-a22b:free", "meta-llama/llama-3.3-70b-instruct:free", "google/gemma-3-27b-it:free"],
    freeHint: "Chế độ dự phòng, dùng khi AI chính bị giới hạn hoặc quá tải."
  },
  openai: {
    label: "AI Cao cấp 1",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    freeHint: "Chế độ cao cấp, bật khi có API key riêng."
  },
  claude: {
    label: "AI Cao cấp 2",
    keyEnv: "CLAUDE_API_KEY",
    modelEnv: "CLAUDE_MODEL",
    defaultModel: "claude-3-5-haiku-latest",
    models: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest", "claude-3-opus-latest"],
    freeHint: "Chế độ cao cấp thiên về phân tích và viết nội dung."
  },
  deepseek: {
    label: "AI Lập luận",
    keyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    freeHint: "Chế độ thiên về suy luận và lập trình."
  },
  grok: {
    label: "AI Sáng tạo",
    keyEnv: "GROK_API_KEY",
    modelEnv: "GROK_MODEL",
    defaultModel: "grok-2-latest",
    models: ["grok-2-latest", "grok-2-vision-latest"],
    freeHint: "Chế độ sáng tạo, bật khi có API key riêng."
  },
  qwen: {
    label: "AI Tổng hợp",
    keyEnv: "QWEN_API_KEY",
    modelEnv: "QWEN_MODEL",
    defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-turbo", "qwen-max"],
    freeHint: "Chế độ tổng hợp, bật khi có API key riêng."
  },
  mistral: {
    label: "AI Gọn nhẹ",
    keyEnv: "MISTRAL_API_KEY",
    modelEnv: "MISTRAL_MODEL",
    defaultModel: "mistral-small-latest",
    models: ["mistral-small-latest", "mistral-large-latest", "codestral-latest"],
    freeHint: "Chế độ gọn nhẹ, bật khi có API key riêng."
  }
};


const PROVIDER_PUBLIC_IDS = {
  gemini: "ai_main",
  groq: "ai_fast",
  openrouter: "ai_backup",
  openai: "ai_pro1",
  claude: "ai_pro2",
  deepseek: "ai_reason",
  grok: "ai_creative",
  qwen: "ai_general",
  mistral: "ai_light"
};
const PROVIDER_INTERNAL_IDS = Object.fromEntries(Object.entries(PROVIDER_PUBLIC_IDS).map(([k, v]) => [v, k]));
function publicProviderId(id) { return PROVIDER_PUBLIC_IDS[id] || id; }
function internalProviderId(id) { return PROVIDER_INTERNAL_IDS[id] || id; }

function maskKey(key = "") {
  const s = String(key || "");
  if (!s) return "";
  if (s.length <= 10) return "********";
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function pickProviderKey(provider, user = null) {
  const info = AI_PROVIDERS[provider];
  if (!info) return "";
  return user?.aiKeys?.[provider] || process.env[info.keyEnv] || "";
}

function pickProviderModel(provider, requestedModel = "", user = null) {
  const info = AI_PROVIDERS[provider];
  if (!info) return requestedModel || "";
  return requestedModel || user?.aiModels?.[provider] || process.env[info.modelEnv] || info.defaultModel;
}

function enabledProvidersForUser(user = null) {
  return Object.entries(AI_PROVIDERS).map(([id, info]) => {
    const key = pickProviderKey(id, user);
    return {
      id: publicProviderId(id),
      label: info.label,
      configured: Boolean(key),
      maskedKey: maskKey(key),
      model: "auto",
      models: [],
      freeHint: info.freeHint
    };
  });
}

function autoProviderOrder(message = "", preferred = "auto", user = null) {
  const text = String(message || "").toLowerCase();
  let order;
  if (preferred && preferred !== "auto") order = [preferred];
  else if (/code|lập trình|debug|node|react|javascript|python|api|server/.test(text)) order = ["groq", "openrouter", "claude", "openai", "deepseek", "gemini", "qwen", "mistral", "grok"];
  else if (/ảnh|image|vision|pdf|file|phân tích ảnh|xem tướng|chỉ tay/.test(text)) order = ["gemini", "openai", "claude", "qwen", "grok", "deepseek", "groq", "openrouter"];
  else if (/rẻ|free|miễn phí|tiết kiệm/.test(text)) order = ["groq", "openrouter", "gemini", "deepseek", "qwen", "mistral", "openai", "claude", "grok"];
  else order = ["groq", "openrouter", "gemini", "openai", "claude", "deepseek", "qwen", "mistral", "grok"];
  return uniqueModels(order).filter(id => AI_PROVIDERS[id] && pickProviderKey(id, user));
}

function partsToPrompt(parts) {
  return (parts || []).map(part => part?.text || "").filter(Boolean).join("\n\n").trim();
}

async function callOpenAICompatible({ provider, apiKey, model, prompt }) {
  const base = provider === "groq" ? "https://api.groq.com/openai/v1" :
               provider === "openrouter" ? "https://openrouter.ai/api/v1" :
               provider === "deepseek" ? "https://api.deepseek.com" :
               provider === "grok" ? "https://api.x.ai/v1" :
               provider === "qwen" ? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" :
               provider === "mistral" ? "https://api.mistral.ai/v1" :
               "https://api.openai.com/v1";
  const response = await withTimeout(fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...(provider === "openrouter" ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://synam.online", "X-Title": process.env.OPENROUTER_APP_NAME || "SyNam AI" } : {})
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  }), 90000);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || json?.message || `HTTP ${response.status}`);
  return json?.choices?.[0]?.message?.content || json?.choices?.[0]?.message?.reasoning || json?.choices?.[0]?.text || "";
}

async function callClaude({ apiKey, model, prompt }) {
  const response = await withTimeout(fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    })
  }), 90000);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || json?.message || `HTTP ${response.status}`);
  return (json?.content || []).map(x => x.text || "").join("\n").trim();
}

async function callGeminiText({ apiKey, model, parts }) {
  const client = apiKey === process.env.GEMINI_API_KEY && ai ? ai : new GoogleGenAI({ apiKey });
  const response = await withTimeout(client.models.generateContent({
    model,
    contents: [{ role: "user", parts }]
  }), 90000);
  return response?.text || response?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
}

async function callAIProvider({ provider, model, prompt, parts, user }) {
  const info = AI_PROVIDERS[provider];
  if (!info) throw new Error(`Provider không hỗ trợ: ${provider}`);
  const apiKey = pickProviderKey(provider, user);
  if (!apiKey) throw new Error(`${info.label} chưa có API key.`);
  const finalModel = pickProviderModel(provider, model, user);
  if (provider === "gemini") {
    const finalParts = parts?.length ? parts : [{ text: prompt }];
    return { provider, label: info.label, model: finalModel, text: await callGeminiText({ apiKey, model: finalModel, parts: finalParts }) };
  }
  if (provider === "claude") return { provider, label: info.label, model: finalModel, text: await callClaude({ apiKey, model: finalModel, prompt }) };
  return { provider, label: info.label, model: finalModel, text: await callOpenAICompatible({ provider, apiKey, model: finalModel, prompt }) };
}

async function tryMultiAI({ prompt, parts, preferredProvider = "auto", requestedModel = "", user = null, council = false }) {
  const attempts = [];
  const order = autoProviderOrder(prompt, preferredProvider, user);
  if (!order.length) throw new Error("Chưa có AI provider nào được cấu hình. Hãy vào Cài đặt AI để nhập API key hoặc thêm key trong .env.");
  if (council) {
    const results = [];
    for (const provider of order.slice(0, 5)) {
      try {
        const result = await callAIProvider({ provider, model: requestedModel, prompt, parts, user });
        results.push(result);
      } catch (error) {
        attempts.push({ provider, error: cleanError(error) });
      }
    }
    if (!results.length) {
      const err = new Error("Không AI nào trong hội đồng phản hồi được.");
      err.attempts = attempts;
      throw err;
    }
    const text = results.map((r, i) => `## Phương án AI ${i + 1}\n${r.text}`).join("\n\n---\n\n");
    return { provider: "council", label: "So sánh nhiều AI", model: "auto", text, results: [], attempts: [] };
  }
  let lastError;
  for (const provider of order) {
    try {
      return await callAIProvider({ provider, model: requestedModel, prompt, parts, user });
    } catch (error) {
      attempts.push({ provider, error: cleanError(error) });
      lastError = error;
    }
  }
  const err = lastError || new Error("Không AI nào phản hồi được.");
  err.attempts = attempts;
  throw err;
}

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite"
];

function uniqueModels(list) {
  return [...new Set(list.map(x => String(x || "").trim()).filter(Boolean))];
}

const MODELS = uniqueModels([
  process.env.GEMINI_MODEL,
  ...(process.env.GEMINI_MODELS || "").split(","),
  ...DEFAULT_MODELS
]);

const DEFAULT_IMAGE_MODELS = [
  // Model ảnh Gemini mới: Nano Banana 2 / Pro / Nano Banana.
  // Thứ tự: nhanh, pro, ổn định cũ hơn. Không dùng preview cũ làm mặc định nữa.
  "gemini-3.1-flash-image",
  "gemini-3-pro-image",
  "gemini-2.5-flash-image",

  // Fallback legacy: chỉ dùng cuối cùng để tương thích key/region cũ.
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation"
];

function parseModelList(value) {
  return String(value || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function resolveImageModelOrder(preferredModel) {
  return uniqueModels([
    preferredModel,
    process.env.GEMINI_IMAGE_MODEL,
    ...parseModelList(process.env.GEMINI_IMAGE_MODELS),
    ...DEFAULT_IMAGE_MODELS
  ]).filter(model => model && model !== "auto");
}

function resolveModelOrder(preferredModel) {
  if (!preferredModel || preferredModel === "auto") return MODELS;
  return uniqueModels([preferredModel, ...MODELS]);
}

function withTimeout(promise, ms = 60000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_GEMINI")), ms))
  ]);
}

function dataUrlToPart(dataUrl, allowedPrefix = "data:") {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith(allowedPrefix)) return null;
  const [meta, data] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  if (!mimeMatch || !data) return null;
  return {
    inlineData: {
      mimeType: mimeMatch[1] || "application/octet-stream",
      data
    }
  };
}

function attachmentToPart(file) {
  if (!file || !file.dataUrl) return null;
  const part = dataUrlToPart(file.dataUrl, "data:");
  if (!part) return null;
  return part;
}

function currentVietnamTime() {
  return new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function cleanError(error) {
  const msg = error?.message || "Có lỗi không xác định.";
  const lower = msg.toLowerCase();
  if (msg.includes("TIMEOUT_GEMINI")) return "AI phản hồi quá lâu. Kiểm tra mạng, quota hoặc thử lại bằng cấu hình nhẹ hơn.";
  if (lower.includes("api key") || lower.includes("apikey") || lower.includes("permission") || lower.includes("unauthorized")) return "API key AI sai, thiếu quyền, hoặc chưa được thêm đúng vào file .env.";
  if (lower.includes("quota") || lower.includes("rate") || lower.includes("429")) return "API key AI hết quota, bị giới hạn tốc độ hoặc tài khoản đang bị giới hạn.";
  if (lower.includes("404") || lower.includes("not found") || lower.includes("model")) return "Model AI không khả dụng với API key này. Server đã thử cấu hình dự phòng nhưng vẫn lỗi.";
  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("econn") || lower.includes("enotfound")) return "Server Node không kết nối được tới AI. Kiểm tra mạng, proxy/VPN, DNS hoặc tường lửa.";
  return msg;
}

async function tryModels(parts, preferredModel = "auto") {
  let lastError;
  const modelOrder = resolveModelOrder(preferredModel);
  const attempts = [];

  for (const model of modelOrder) {
    try {
      console.log("Đang thử model:", model);
      const response = await withTimeout(ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }]
      }));
      return {
        model,
        text: response?.text || response?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || ""
      };
    } catch (err) {
      const reason = cleanError(err);
      console.log("Model lỗi:", model, err.message);
      attempts.push({ model, error: reason });
      lastError = err;
    }
  }

  const finalError = lastError || new Error("Không có cấu hình AI nào để thử.");
  finalError.attempts = attempts;
  throw finalError;
}

app.get("/api", (req, res) => {
  res.json({ ok: true, app: "Sỹ Năm Mystic Phoenix", routes: ["/api/health", "/api/models", "/api/ai/providers", "/api/multi-ai/chat", "/api/auth/register", "/api/auth/login", "/api/auth/social", "/api/auth/me", "/api/auth/firebase-config"] });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim() || "Thành viên Sỹ Năm";
    const cleanPassword = String(password || "");
    if (!cleanEmail || !cleanEmail.includes("@")) return res.status(400).json({ error: "Email không hợp lệ." });
    if (cleanPassword.length < 6) return res.status(400).json({ error: "Mật khẩu cần ít nhất 6 ký tự." });
    const users = await readUsers();
    if (users.some(u => u.email === cleanEmail)) return res.status(409).json({ error: "Email này đã đăng ký." });
    const user = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      plan: "Free",
      createdAt: new Date().toISOString()
    };
    users.push(user);
    await writeUsers(users);
    const token = await createSession(user.id, "password");
    res.json({ ok: true, token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const users = await readUsers();
    const user = users.find(u => u.email === cleanEmail);
    if (!user || !verifyPassword(password || "", user.passwordHash)) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
    }
    const token = await createSession(user.id, "password");
    res.json({ ok: true, token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});


app.get("/api/auth/firebase-config", (req, res) => {
  const cfg = firebaseConfigFromEnv();
  res.json({ ok: true, enabled: isFirebaseConfigured(), config: cfg });
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await currentUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Chưa đăng nhập hoặc phiên đã hết hạn." });
    res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    await destroySession(req);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.post("/api/auth/social", async (req, res) => {
  try {
    const { provider, uid, email, name, avatar, idToken } = req.body || {};
    const cleanProvider = String(provider || "").trim().toLowerCase();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanUid = String(uid || "").trim();
    const cleanName = String(name || "").trim() || (cleanProvider === "facebook" ? "Facebook User" : "Google User");

    if (!["google", "facebook"].includes(cleanProvider)) {
      return res.status(400).json({ error: "Provider không hợp lệ. Chỉ hỗ trợ google hoặc facebook." });
    }
    if (!cleanEmail && !cleanUid) {
      return res.status(400).json({ error: "Thiếu email hoặc uid từ tài khoản mạng xã hội." });
    }

    // Bản này dùng Firebase Auth ở frontend để đăng nhập Google/Facebook.
    // Server lưu hồ sơ thành viên local để chạy được trên Render/Namecheap.
    // Với sản phẩm thương mại, nên bật firebase-admin để xác minh idToken ở server.
    const users = await readUsers();
    let user = users.find(u => (cleanEmail && u.email === cleanEmail) || (u.socialIds && u.socialIds[cleanProvider] === cleanUid));
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: cleanName,
        email: cleanEmail || `${cleanProvider}_${cleanUid}@synam.local`,
        passwordHash: "",
        plan: "Free",
        avatar: avatar || "",
        providers: [cleanProvider],
        socialIds: { [cleanProvider]: cleanUid },
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      users.push(user);
    } else {
      user.name = user.name || cleanName;
      user.email = user.email || cleanEmail;
      user.avatar = avatar || user.avatar || "";
      user.providers = uniqueModels([...(user.providers || []), cleanProvider]);
      user.socialIds = { ...(user.socialIds || {}), [cleanProvider]: cleanUid };
      user.lastLoginAt = new Date().toISOString();
    }
    await writeUsers(users);
    const token = await createSession(user.id, cleanProvider);
    res.json({ ok: true, token, user: publicUser(user), provider: cleanProvider, firebaseConfigured: isFirebaseConfigured(), tokenReceived: Boolean(idToken) });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.post("/api/auth/update-profile", async (req, res) => {
  try {
    const { email, name, plan } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const users = await readUsers();
    const user = users.find(u => u.email === cleanEmail);
    if (!user) return res.status(404).json({ error: "Chưa tìm thấy tài khoản." });
    if (name) user.name = String(name).trim();
    if (plan) user.plan = String(plan).trim();
    await writeUsers(users);
    res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});


app.get("/api/ai/providers", async (req, res) => {
  try {
    const user = await currentUserFromRequest(req).catch(() => null);
    res.json({ ok: true, providers: enabledProvidersForUser(user), defaultProvider: process.env.DEFAULT_AI_PROVIDER || "auto" });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.get("/api/ai/user-keys", async (req, res) => {
  try {
    const user = await currentUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Cần đăng nhập để lưu API key cá nhân." });
    res.json({ ok: true, providers: enabledProvidersForUser(user) });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.post("/api/ai/user-keys", async (req, res) => {
  try {
    const user = await currentUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Cần đăng nhập để lưu API key cá nhân." });
    const { keys = {}, models = {} } = req.body || {};
    const users = await readUsers();
    const saved = users.find(u => u.id === user.id);
    if (!saved) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    saved.aiKeys = saved.aiKeys || {};
    saved.aiModels = saved.aiModels || {};
    for (const publicId of Object.keys(keys || {})) {
      const id = internalProviderId(publicId);
      if (!AI_PROVIDERS[id]) continue;
      const value = String(keys[publicId] || "").trim();
      if (value) saved.aiKeys[id] = value;
    }
    for (const publicId of Object.keys(models || {})) {
      const id = internalProviderId(publicId);
      if (!AI_PROVIDERS[id]) continue;
      const value = String(models[publicId] || "").trim();
      if (value) saved.aiModels[id] = value;
    }
    await writeUsers(users);
    res.json({ ok: true, providers: enabledProvidersForUser(saved), note: "Đã lưu API key cá nhân vào data/users.json. Bản demo chưa mã hóa key, chỉ dùng test cá nhân." });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.post("/api/multi-ai/chat", async (req, res) => {
  try {
    const user = await currentUserFromRequest(req).catch(() => null);
    const { message, provider = "auto", model = "", council = false, context } = req.body || {};
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return res.status(400).json({ error: "Bạn cần nhập câu hỏi cho Multi-AI." });
    const prompt = `Bạn là Sỹ Năm Multi-AI trong app Sỹ Năm Mystic. Trả lời bằng tiếng Việt, rõ ràng, có Markdown đẹp.\n\nNGỮ CẢNH:\n${context ? JSON.stringify(context, null, 2).slice(0, 4000) : "Không có"}\n\nCÂU HỎI:\n${cleanMessage}`;
    const safeProvider = provider === "auto" ? "auto" : internalProviderId(provider);
    const result = await tryMultiAI({ prompt, parts: [{ text: prompt }], preferredProvider: safeProvider || process.env.DEFAULT_AI_PROVIDER || "auto", requestedModel: model, user, council: Boolean(council) });
    res.json({ ok: true, label: result.provider === "council" ? "So sánh nhiều AI" : "Sỹ Năm AI", text: result.text });
  } catch (error) {
    res.status(500).json({ ok: false, error: cleanError(error).replace(/Gemini|Groq|OpenRouter|OpenAI|ChatGPT|Claude|DeepSeek|Grok|Qwen|Mistral/gi, "AI") });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasAIKey: Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY),
    aiStatus: "private",
    app: "Sỹ Năm Mystic AI Ultimate Pro"
  });
});

app.get("/api/models", (req, res) => {
  res.json({ ok: true, aiStatus: "private", note: "Danh sách model được ẩn khỏi giao diện công khai." });
});

app.get("/api/gemini-check", async (req, res) => {
  try {
    if (!ai) return res.status(400).json({ error: "Chưa có API key AI trong file .env." });
    const preferredModel = req.query.model || "auto";
    const result = await tryModels([{ text: "Trả lời ngắn gọn: OK" }], preferredModel);
    res.json({ ok: true, text: result.text });
  } catch (error) {
    res.status(500).json({ ok: false, error: cleanError(error), attempts: error.attempts || [] });
  }
});


app.post("/api/vision-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({
        error: "Chưa cấu hình API key AI. Phần xem ảnh cần server AI."
      });
    }

    const body = req.body || {};
    const { mode, type, image, note, focus, palmImage, faceImage, palmLine, palmDepth, palmNote, facePart, faceNote, geminiModel } = body;
    const normalizedMode = mode || type;
    const isPalm = normalizedMode === "palm" || normalizedMode === "palmistry";
    const isFace = normalizedMode === "face" || normalizedMode === "face-reading";
    const finalPalmImage = palmImage || (isPalm ? image : "");
    const finalFaceImage = faceImage || (isFace ? image : "");
    const finalPalmNote = palmNote || (isPalm ? note : "");
    const finalFaceNote = faceNote || (isFace ? note : "");
    const finalPalmLine = palmLine || (isPalm ? focus : "");
    const finalFacePart = facePart || (isFace ? focus : "");

    let instruction = "";
    if (isPalm) {
      instruction = `
Bạn là chuyên gia viết nhận xét CHỈ TAY tham khảo văn hóa bằng tiếng Việt. Hãy phân tích chuyên sâu, chi tiết, có cấu trúc rõ ràng.

YÊU CẦU AN TOÀN:
- Chỉ mô tả thận trọng những nét quan sát được từ ảnh và ghi chú.
- Không định danh người trong ảnh.
- Không kết luận sức khỏe, bệnh tật, tuổi thọ, tài sản, hôn nhân chắc chắn hoặc số phận chắc chắn.
- Không phán kiểu tuyệt đối. Dùng ngôn ngữ: "có xu hướng", "theo tham khảo", "có thể gợi ý".
- Nếu ảnh chưa rõ, nói rõ phần nào chưa đủ dữ liệu và hướng dẫn chụp lại.
- Viết Markdown đẹp, rõ mục, dễ đọc, chuyên sâu hơn bản local.

DỮ LIỆU NGƯỜI DÙNG:
- Đường tay nổi bật: ${finalPalmLine || "Không chọn"}
- Độ rõ đường tay: ${palmDepth || "Không chọn"}
- Ghi chú chỉ tay: ${finalPalmNote || "Không có"}

Hãy trả về theo cấu trúc:
1. Nhận xét chất lượng ảnh/ghi chú
2. Tổng quan lòng bàn tay và khí chất tham khảo
3. Phân tích đường tay chính được chọn
4. Phân tích độ rõ, độ liền mạch, hướng chạy của đường tay nếu quan sát được
5. Diễn giải về tư duy, cảm xúc, thói quen hành động theo hướng tự nhận thức
6. Điểm mạnh nên phát huy
7. Điểm cần cân bằng/rèn luyện
8. Câu hỏi tự kiểm chứng trong đời sống
9. Lưu ý độ tin cậy và cách chụp ảnh tốt hơn
`;
    } else if (isFace) {
      instruction = `
Bạn là chuyên gia viết nhận xét TƯỚNG MẶT/PHONG THÁI tham khảo văn hóa bằng tiếng Việt. Hãy phân tích chuyên sâu, chi tiết, có cấu trúc rõ ràng.

YÊU CẦU AN TOÀN:
- Chỉ mô tả thận trọng những nét quan sát được từ ảnh và ghi chú.
- Không định danh người trong ảnh.
- Không kết luận sức khỏe, bệnh tật, tuổi thọ, đạo đức, tài sản, hôn nhân chắc chắn hoặc số phận chắc chắn.
- Không suy đoán thuộc tính nhạy cảm.
- Không phán kiểu tuyệt đối. Dùng ngôn ngữ: "có xu hướng", "theo tham khảo", "có thể gợi ý".
- Nếu ảnh chưa rõ, nói rõ phần nào chưa đủ dữ liệu và hướng dẫn chụp lại.
- Viết Markdown đẹp, rõ mục, dễ đọc, chuyên sâu hơn bản local.

DỮ LIỆU NGƯỜI DÙNG:
- Bộ phận muốn xem kỹ: ${finalFacePart || "Không chọn"}
- Ghi chú tướng mặt: ${finalFaceNote || "Không có"}

Hãy trả về theo cấu trúc:
1. Nhận xét chất lượng ảnh/ghi chú
2. Tổng quan thần thái và phong thái tham khảo
3. Phân tích bộ phận được chọn
4. Phân tích tổng thể: trán, mắt, mũi, miệng, cằm/khuôn mặt nếu quan sát được
5. Diễn giải về phong cách giao tiếp, khí chất, khả năng tạo thiện cảm theo hướng tự nhận thức
6. Điểm mạnh nên phát huy
7. Điểm cần cân bằng/rèn luyện
8. Gợi ý cải thiện phong thái/hình ảnh cá nhân
9. Lưu ý độ tin cậy và cách chụp ảnh tốt hơn
`;
    } else {
      instruction = `
Bạn là chuyên gia viết nhận xét tham khảo văn hóa về chỉ tay và tướng mặt bằng tiếng Việt.

YÊU CẦU AN TOÀN:
- Chỉ mô tả thận trọng những nét quan sát được từ ảnh và ghi chú.
- Không định danh người trong ảnh.
- Không kết luận sức khỏe, bệnh tật, tuổi thọ, tài sản, hôn nhân chắc chắn hoặc số phận chắc chắn.
- Viết Markdown đẹp, rõ mục, dễ đọc.

DỮ LIỆU:
- Đường tay nổi bật: ${finalPalmLine || "Không chọn"}
- Độ rõ đường tay: ${palmDepth || "Không chọn"}
- Ghi chú chỉ tay: ${finalPalmNote || "Không có"}
- Bộ phận tướng mặt: ${finalFacePart || "Không chọn"}
- Ghi chú tướng mặt: ${finalFaceNote || "Không có"}
`;
    }

    const parts = [{ text: instruction }];
    const palmPart = dataUrlToPart(palmImage);
    const facePartData = dataUrlToPart(faceImage);

    if (isPalm && palmPart) {
      parts.push({ text: "Ảnh lòng bàn tay:" });
      parts.push(palmPart);
    } else if (isFace && facePartData) {
      parts.push({ text: "Ảnh khuôn mặt:" });
      parts.push(facePartData);
    } else {
      if (palmPart) { parts.push({ text: "Ảnh lòng bàn tay:" }); parts.push(palmPart); }
      if (facePartData) { parts.push({ text: "Ảnh khuôn mặt:" }); parts.push(facePartData); }
    }

    if (isPalm && !palmPart && !palmNote) {
      return res.status(400).json({ error: "Bạn cần tải ảnh lòng bàn tay hoặc nhập ghi chú để AI xem chỉ tay." });
    }
    if (isFace && !facePartData && !faceNote) {
      return res.status(400).json({ error: "Bạn cần tải ảnh khuôn mặt hoặc nhập ghi chú để AI xem tướng." });
    }
    if (!isPalm && !isFace && !palmPart && !facePartData && !palmNote && !faceNote) {
      return res.status(400).json({ error: "Bạn cần tải ít nhất một ảnh hoặc nhập ghi chú để AI xem tay/mặt." });
    }

    const result = await tryModels(parts, geminiModel);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.post("/api/chat-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({ error: "Chưa cấu hình API key AI. Chatbot cần server AI." });
    }

    const { message, attachments, context, history, geminiModel } = req.body || {};
    const cleanMessage = String(message || "").trim();
    const files = Array.isArray(attachments) ? attachments.slice(0, 6) : [];

    if (!cleanMessage && files.length === 0) {
      return res.status(400).json({ error: "Bạn cần nhập câu hỏi hoặc tải ảnh/file lên trước." });
    }

    const historyText = Array.isArray(history)
      ? history.slice(-8).map(m => `${m.role === "assistant" ? "AI" : "Người dùng"}: ${String(m.text || "").slice(0, 2000)}`).join("\n")
      : "";

    const contextText = context ? JSON.stringify(context, null, 2).slice(0, 6000) : "Không có";

    const parts = [{ text: `
Bạn là Sỹ Năm AI trong app Sỹ Năm Mystic Ultimate Pro, nói chuyện tự nhiên, rõ ràng, hữu ích. Bạn không tự nêu tên nhà cung cấp AI hoặc model đang sử dụng.

THỜI GIAN HIỆN TẠI TẠI VIỆT NAM: ${currentVietnamTime()}

QUY TẮC:
- Trả lời bằng tiếng Việt, dễ hiểu, có Markdown đẹp.
- Có thể phân tích ảnh/file người dùng tải lên nếu file đọc được.
- Nếu file không đủ dữ liệu để đọc, hãy nói rõ và hướng dẫn người dùng gửi file dạng txt/csv/json/md hoặc ảnh rõ hơn.
- Không bịa nội dung file nếu không đọc được.
- Với nội dung tử vi/xem tướng, chỉ xem là tham khảo văn hóa, không phán chắc số phận/sức khỏe/tài chính/pháp lý.
- Nếu câu hỏi là kỹ thuật, trả lời theo từng bước cụ thể.

NGỮ CẢNH APP HIỆN TẠI:
${contextText}

LỊCH SỬ CHAT GẦN ĐÂY:
${historyText || "Chưa có"}

CÂU HỎI CỦA NGƯỜI DÙNG:
${cleanMessage || "Người dùng chỉ gửi file/ảnh, hãy phân tích nội dung đã tải lên."}
` }];

    for (const [index, file] of files.entries()) {
      parts.push({ text: `\nFile đính kèm ${index + 1}: ${file.name || "không tên"} | MIME: ${file.type || "không rõ"} | Kích thước: ${file.size || 0} bytes` });
      if (file.textPreview) {
        parts.push({ text: `Nội dung văn bản đọc được từ file ${index + 1}:\n${String(file.textPreview).slice(0, 12000)}` });
      }
      const inline = attachmentToPart(file);
      if (inline) parts.push(inline);
    }

    const result = await tryModels(parts, geminiModel);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});



function extractImagesFromGeminiResponse(response) {
  const images = [];
  const texts = [];
  const parts = response?.parts || response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part?.text) texts.push(part.text);
    if (part?.inlineData?.data) {
      images.push({
        mimeType: part.inlineData.mimeType || "image/png",
        data: part.inlineData.data
      });
    }
  }
  if (!texts.length && response?.text) texts.push(response.text);
  return { images, text: texts.join("\n").trim() };
}

function imageModelOrder(preferredModel) {
  return resolveImageModelOrder(preferredModel);
}

async function tryImageModels(parts, preferredModel = "auto") {
  let lastError;
  const attempts = [];
  for (const model of imageModelOrder(preferredModel)) {
    if (!model || model === "auto") continue;
    try {
      console.log("Đang thử image model:", model);
      // Với các model Nano Banana mới, Google khuyến nghị gọi generateContent trực tiếp.
      // Không ép responseModalities trước, vì một số model mới trả lỗi khi dùng cấu hình cũ.
      let response = await withTimeout(ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }]
      }), 90000);

      // Fallback cho model preview cũ nếu request kiểu mới không trả ảnh.
      let extracted = extractImagesFromGeminiResponse(response);
      if (!extracted.images.length && /preview|exp|2\.0/.test(model)) {
        response = await withTimeout(ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: { responseModalities: ["TEXT", "IMAGE"] }
        }), 90000);
        extracted = extractImagesFromGeminiResponse(response);
      }
      if (extracted.images.length) return { model, ...extracted };
      const err = new Error("AI không trả ảnh. Có thể API key chưa được cấp quyền tạo/chỉnh ảnh hoặc cấu hình không hỗ trợ image output.");
      err.responseText = extracted.text;
      throw err;
    } catch (err) {
      const reason = cleanError(err);
      console.log("Image model lỗi:", model, err.message);
      attempts.push({ model, error: reason });
      lastError = err;
    }
  }
  const finalError = lastError || new Error("Không có cấu hình AI tạo ảnh nào để thử.");
  finalError.attempts = attempts;
  finalError.message = `${cleanError(finalError)} | Đã thử cấu hình ảnh: ${attempts.map(a => `${a.model}: ${a.error}`).join(" ; ") || "không có"}`;
  throw finalError;
}

app.post("/api/image-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({ error: "Chưa cấu hình API key AI. Tạo/chỉnh ảnh cần API AI thật." });
    }
    const { mode, prompt, image, attachments, geminiModel } = req.body || {};
    const cleanPrompt = String(prompt || "").trim();
    const isEdit = mode === "edit";
    const files = Array.isArray(attachments) ? attachments.slice(0, 3) : [];
    const mainImage = image || files.find(f => String(f.type || "").startsWith("image/"))?.dataUrl || "";

    if (!cleanPrompt) return res.status(400).json({ error: "Bạn cần nhập mô tả ảnh hoặc yêu cầu chỉnh sửa." });
    if (isEdit && !mainImage) return res.status(400).json({ error: "Chế độ chỉnh sửa ảnh cần tải ảnh gốc lên trước." });

    const parts = [{ text: `
Bạn là module TẠO ẢNH / CHỈNH SỬA ẢNH AI trong app Sỹ Năm Mystic.
THỜI GIAN HIỆN TẠI TẠI VIỆT NAM: ${currentVietnamTime()}

NHIỆM VỤ: ${isEdit ? "Chỉnh sửa ảnh người dùng gửi theo yêu cầu" : "Tạo ảnh mới theo mô tả"}
YÊU CẦU NGƯỜI DÙNG: ${cleanPrompt}

QUY TẮC:
- Trả về ảnh kết quả, không chỉ mô tả bằng chữ.
- Nếu là chỉnh sửa ảnh: giữ bố cục/chủ thể chính càng sát ảnh gốc càng tốt, chỉ thay đổi đúng phần người dùng yêu cầu.
- Không tự thêm chữ/logo/số điện thoại nếu người dùng không yêu cầu.
- Không tái tạo hoặc thay mặt người thật thành người khác khi chỉnh ảnh.
` }];

    if (isEdit) {
      const imagePart = dataUrlToPart(mainImage);
      if (!imagePart) return res.status(400).json({ error: "Ảnh tải lên không hợp lệ hoặc quá nặng." });
      parts.push({ text: "Ảnh gốc cần chỉnh sửa:" });
      parts.push(imagePart);
    }

    const result = await tryImageModels(parts, geminiModel);
    res.json({ ok: true, model: result.model, text: result.text, images: result.images });
  } catch (error) {
    res.status(500).json({ ok: false, error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.post("/api/teacher-ai", async (req, res) => {
  try {
    if (!ai) return res.status(400).json({ error: "Chưa cấu hình API key AI. Thầy Sỹ Năm AI cần server AI." });
    const { message, context, geminiModel } = req.body || {};
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return res.status(400).json({ error: "Bạn cần nhập câu hỏi trước." });
    const contextText = context ? JSON.stringify(context, null, 2).slice(0, 7000) : "Không có";
    const parts = [{ text: `
Bạn là "Thầy Sỹ Năm" trong app Sỹ Năm Mystic Ultimate Pro. Hãy trả lời bằng tiếng Việt, giọng ấm áp, gần gũi, có màu sắc huyền học nhưng không mê tín cực đoan.

QUY TẮC:
- Đây là module riêng của Thầy Sỹ Năm, không phải chatbot Hỏi và Đáp AI.
- Có thể luận về tử vi, tình duyên, công việc, phong thủy, hướng phát triển bản thân theo hướng tham khảo văn hóa.
- Không phán chắc tương lai, không khẳng định sức khỏe/bệnh tật/tuổi thọ/tài chính/pháp lý.
- Chia mục rõ, giải thích chi tiết, có gợi ý thực tế.
- Nếu có ngữ cảnh bản mệnh trước đó, hãy tận dụng; nếu không có, hỏi/gợi ý người dùng nhập ngày sinh.

NGỮ CẢNH ĐANG CÓ:
${contextText}

CÂU HỎI:
${cleanMessage}
` }];
    const result = await tryModels(parts, geminiModel);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.post("/api/love-ai", async (req, res) => {
  try {
    if (!ai) return res.status(400).json({ error: "Chưa cấu hình API key AI. AI tình duyên cần server AI." });
    const body = req.body || {};
    const { persons, focus, localReport, geminiModel, name1, birth1, name2, birth2 } = body;
    const finalPersons = persons || [{name:name1||"Người 1", birthDate:birth1||""},{name:name2||"Người 2", birthDate:birth2||""}];
    const parts = [{ text: `
Bạn là chuyên gia luận TÌNH DUYÊN/HỢP TUỔI bằng tiếng Việt trong app Sỹ Năm Mystic Ultimate Pro. Hãy viết chi tiết, rõ ràng, có cấu trúc đẹp.

THỜI GIAN HIỆN TẠI TẠI VIỆT NAM: ${currentVietnamTime()}

YÊU CẦU:
- Dựa trên ngày tháng năm sinh dương lịch của 2 người, Can Chi, Ngũ hành, nạp âm, Địa Chi, cung phi, cung hoàng đạo.
- Giải thích vì sao hợp/chưa hợp, không chỉ chấm điểm.
- Có mục điểm mạnh, điểm dễ xung đột, cách hóa giải/hòa hợp, lời khuyên thực tế.
- Không phán chắc cưới/ly hôn/chia tay/giàu nghèo/số phận. Chỉ nói theo hướng tham khảo văn hóa và tự nhận thức.
- Nếu dữ liệu thiếu giờ sinh thì nói rõ phần giờ sinh chỉ tham khảo/không có.
- Trả về Markdown đẹp.

DỮ LIỆU 2 NGƯỜI:
${JSON.stringify(finalPersons, null, 2)}

TRỌNG TÂM MUỐN XEM:
${focus || "tong-quan"}

BẢN LOCAL NỀN:
${localReport || ""}

Hãy trả về theo cấu trúc:
1. Bảng tổng quan 2 người
2. Điểm hợp tổng quan và mức độ tương hợp
3. Phân tích Can Chi - Địa Chi
4. Phân tích Ngũ hành/Nạp âm
5. Phân tích cung phi và khí gia đạo
6. Tính cách yêu, cách giao tiếp, điểm hút nhau
7. Điểm dễ xung đột
8. Cách hòa hợp và phát triển lâu dài
9. Lưu ý tham khảo
` }];
    const result = await tryModels(parts, geminiModel);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.post("/api/mystic-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({
        error: "Chưa cấu hình API key AI. App vẫn chạy bản local, nhưng AI luận giải dài cần server AI."
      });
    }

    const {
      profile,
      name, birthDate, birthTime, gender,
      computed,
      localReport,
      palmImage,
      faceImage,
      palmNote,
      faceNote,
      geminiModel
    } = req.body || {};

    const finalPalmImage = palmImage || "";
    const finalFaceImage = faceImage || "";
    const finalPalmNote = palmNote || "";
    const finalFaceNote = faceNote || "";

    const instruction = `
Bạn là chuyên gia viết luận giải huyền học AI bằng tiếng Việt, giọng văn sang, chi tiết, có chiều sâu, không mê tín cực đoan.

THỜI GIAN HIỆN TẠI TẠI VIỆT NAM: ${currentVietnamTime()}

YÊU CẦU BẮT BUỘC:
- Viết dài, mạch lạc, chia mục rõ như bài tư vấn chuyên nghiệp.
- Có bảng tổng quan bản mệnh ở đầu.
- Kết hợp Đông phương: Can Chi, Ngũ hành, âm dương, cung phi, giờ sinh.
- Kết hợp Tây phương: cung hoàng đạo.
- Nếu có ảnh lòng bàn tay/khuôn mặt: chỉ nhận xét thận trọng theo những gì quan sát được, không kết luận danh tính, sức khỏe, tuổi thọ, giàu nghèo hay số phận chắc chắn.
- Không nói "tôi không thể". Hãy viết theo hướng tham khảo văn hóa và tự nhận thức.
- Không phán chắc tương lai. Luôn có đoạn lưu ý cuối bài.
- Văn phong giống ví dụ: cuốn hút, nhiều hình ảnh, chi tiết nhưng không quá lố.
- Trả về Markdown đẹp.

DỮ LIỆU NGƯỜI DÙNG:
${JSON.stringify(profile || { name, birthDate, birthTime, gender }, null, 2)}

KẾT QUẢ TÍNH TOÁN LOCAL:
${JSON.stringify(computed, null, 2)}

GHI CHÚ ẢNH CHỈ TAY:
${finalPalmNote || "Không có"}

GHI CHÚ ẢNH KHUÔN MẶT:
${finalFaceNote || "Không có"}

BẢN LUẬN GIẢI LOCAL NỀN:
${localReport || ""}

Hãy viết bài luận giải cuối cùng theo cấu trúc:
1. Bảng tổng quan bản mệnh
2. Phân tích âm dương, ngũ hành và can chi
3. Cung mệnh, cung phi và hướng khí
4. Chiêm tinh học phương Tây
5. Tướng số & khí chất đặc trưng
6. Chỉ tay/khuôn mặt nếu có ảnh hoặc ghi chú
7. Luận sự nghiệp, tài lộc, quan hệ
8. Gợi ý phát triển bản thân
9. Lưu ý về độ tin cậy và tính tham khảo
`;

    const parts = [{ text: instruction }];

    const palmPart = dataUrlToPart(finalPalmImage);
    const facePart = dataUrlToPart(finalFaceImage);

    if (palmPart) {
      parts.push({ text: "Ảnh lòng bàn tay người dùng tải lên để tham khảo đường tay:" });
      parts.push(palmPart);
    }

    if (facePart) {
      parts.push({ text: "Ảnh khuôn mặt người dùng tải lên để tham khảo phong thái/tướng mặt:" });
      parts.push(facePart);
    }

    const result = await tryModels(parts, geminiModel);
    res.json(result);

  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Sỹ Năm Mystic AI Ultimate Pro hoạt động thành công trên port ${PORT}.`);
});
