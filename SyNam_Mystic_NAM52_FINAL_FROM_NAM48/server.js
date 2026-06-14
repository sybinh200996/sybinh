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
    label: "Google Gemini",
    keyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite"],
    freeHint: "Google AI Studio thường có free tier để test."
  },
  groq: {
    label: "Groq Free / Siêu nhanh",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "mixtral-8x7b-32768"],
    freeHint: "Groq có quota miễn phí, trả lời rất nhanh. Lấy key tại console.groq.com."
  },
  openrouter: {
    label: "OpenRouter Free Models",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "deepseek/deepseek-r1:free",
    models: ["deepseek/deepseek-r1:free", "deepseek/deepseek-chat-v3-0324:free", "qwen/qwen3-235b-a22b:free", "meta-llama/llama-3.3-70b-instruct:free", "google/gemma-3-27b-it:free"],
    freeHint: "OpenRouter có một số model :free. Lấy key tại openrouter.ai rồi dán vào đây."
  },
  openai: {
    label: "ChatGPT / OpenAI",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    freeHint: "Cần API key OpenAI, thường phải có billing."
  },
  claude: {
    label: "Anthropic Claude",
    keyEnv: "CLAUDE_API_KEY",
    modelEnv: "CLAUDE_MODEL",
    defaultModel: "claude-3-5-haiku-latest",
    models: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest", "claude-3-opus-latest"],
    freeHint: "Cần API key Anthropic."
  },
  deepseek: {
    label: "DeepSeek",
    keyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    freeHint: "Có thể test bằng key DeepSeek nếu tài khoản còn quota."
  },
  grok: {
    label: "xAI Grok",
    keyEnv: "GROK_API_KEY",
    modelEnv: "GROK_MODEL",
    defaultModel: "grok-2-latest",
    models: ["grok-2-latest", "grok-2-vision-latest"],
    freeHint: "Cần API key xAI."
  },
  qwen: {
    label: "Alibaba Qwen",
    keyEnv: "QWEN_API_KEY",
    modelEnv: "QWEN_MODEL",
    defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-turbo", "qwen-max"],
    freeHint: "Dùng DashScope/OpenAI-compatible endpoint nếu có key."
  },
  mistral: {
    label: "Mistral AI",
    keyEnv: "MISTRAL_API_KEY",
    modelEnv: "MISTRAL_MODEL",
    defaultModel: "mistral-small-latest",
    models: ["mistral-small-latest", "mistral-large-latest", "codestral-latest"],
    freeHint: "Cần API key Mistral."
  }
};

function maskKey(key = "") {
  const s = String(key || "");
  if (!s) return "";
  if (s.length <= 10) return "********";
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function pickProviderKey(provider, user = null) {
  const info = AI_PROVIDERS[provider];
  if (!info) return "";
  if (provider === "claude") {
    return user?.aiKeys?.[provider] || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "";
  }
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
      id,
      label: info.label,
      configured: Boolean(key),
      maskedKey: maskKey(key),
      model: pickProviderModel(id, "", user),
      models: info.models,
      freeHint: info.freeHint
    };
  });
}

function autoProviderOrder(message = "", preferred = "auto", user = null) {
  const text = String(message || "").toLowerCase();
  let order;
  if (preferred && preferred !== "auto") order = [preferred, "groq", "openrouter", "gemini", "deepseek", "qwen", "openai", "claude", "grok", "mistral"];
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
      ...(provider === "openrouter" ? { "HTTP-Referer": "https://synam-ai.local", "X-Title": "SyNam Mystic" } : {})
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35
    })
  }), 90000);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || json?.message || `HTTP ${response.status}`);
  return json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || "";
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
    contents: [{ role: "user", parts }],
    config: { temperature: 0.35, topP: 0.85 }
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
    const text = results.map((r, idx) => `## Ý kiến AI ${idx + 1}\n${hideModelLeakServer(r.text)}`).join("\n\n---\n\n");
    return { provider: "council", label: "Hội Đồng AI", text, results: results.map(r => ({ label: 'Đặng Năm', text: hideModelLeakServer(r.text) })), attempts };
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



// ===== NAM27 CLEAN AI CORE STABLE FIX =====
const VN_WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
function vietnamDateFromNow(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {});
  const isoNoon = `${parts.year}-${parts.month}-${parts.day}T12:00:00+07:00`;
  const vnDate = new Date(isoNoon);
  return { date: vnDate, day: parts.day, month: parts.month, year: parts.year, hour: parts.hour, minute: parts.minute, weekday: VN_WEEKDAYS[vnDate.getUTCDay()] };
}
function formatVietnamDate(offsetDays = 0) {
  const x = vietnamDateFromNow(offsetDays);
  return `${x.weekday}, ngày ${x.day}/${x.month}/${x.year}`;
}
function directDateTimeAnswer(message = '') {
  const q = String(message || '').toLowerCase().normalize('NFC');

  // Không chặn các câu hỏi cần AI/API trả lời như thời tiết, lịch sự kiện, dự báo, giá cả...
  // Lỗi cũ: câu "dự báo thời tiết 3 ngày" có chữ "ngày" nên bị local date handler nuốt mất.
  const needsLiveOrKnowledgeAnswer = /(thời tiết|thoi tiet|dự báo|du bao|nhiệt độ|nhiet do|mưa|mua|nắng|nang|bão|bao|gió|gio|độ ẩm|do am|khí hậu|khi hau|lịch thi đấu|lich thi dau|tin tức|tin tuc|giá|gia|tỷ giá|ty gia)/i.test(q);
  if (needsLiveOrKnowledgeAnswer) return null;

  const asksDate = /(hôm nay|hom nay|ngày mai|ngay mai|ngày kia|ngay kia|hôm qua|hom qua|thứ mấy|thu may|ngày bao nhiêu|ngay bao nhieu|mấy giờ|may gio|bây giờ|bay gio|giờ hiện tại|gio hien tai)/i.test(q);
  if (!asksDate) return null;

  let offset = 0;
  let label = 'Hôm nay';
  if (/(ngày kia|ngay kia)/i.test(q)) { offset = 2; label = 'Ngày kia'; }
  else if (/(ngày mai|ngay mai|\bmai\b)/i.test(q)) { offset = 1; label = 'Ngày mai'; }
  else if (/(hôm qua|hom qua)/i.test(q)) { offset = -1; label = 'Hôm qua'; }

  const x = vietnamDateFromNow(offset);
  if (/(mấy giờ|may gio|bây giờ|bay gio|giờ hiện tại|gio hien tai)/i.test(q)) {
    return `${label} là **${x.weekday}, ngày ${x.day}/${x.month}/${x.year}**. Hiện tại ở Việt Nam khoảng **${x.hour}:${x.minute}**.`;
  }
  return `${label} là **${x.weekday}, ngày ${x.day}/${x.month}/${x.year}**.`;
}

function isWeatherQuestion(message = '') {
  const q = String(message || '').toLowerCase().normalize('NFC');
  return /(thời tiết|thoi tiet|dự báo|du bao|nhiệt độ|nhiet do|mưa|mua|nắng|nang|bão|bao|gió|gio|độ ẩm|do am|khí hậu|khi hau)/i.test(q);
}


function stripVietnameseWeatherWords(text = '') {
  return String(text || '')
    .replace(/(dự báo|du bao|thời tiết|thoi tiet|nhiệt độ|nhiet do|khí hậu|khi hau)/ig, ' ')
    .replace(/(hôm nay|hom nay|ngày mai|ngay mai|ngày kia|ngay kia|bây giờ|bay gio|hiện tại|hien tai|ra sao|như thế nào|nhu the nao|thế nào|the nao)/ig, ' ')
    .replace(/(ở|o|tại|tai|cho|khu vực|khu vuc)/ig, ' ')
    .replace(/[?.,!\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWeatherLocation(message = '') {
  const raw = String(message || '').trim();
  const lower = raw.toLowerCase().normalize('NFC');

  // Ưu tiên map các địa danh Việt Nam hay bị wttr/geocode đoán sai.
  const known = [
    [/việt\s*trì|viet\s*tri|vinh\s*que/i, { name: 'Việt Trì, Phú Thọ, Việt Nam', latitude: 21.3227, longitude: 105.4020 }],
    [/phú\s*thọ|phu\s*tho/i, { name: 'Phú Thọ, Việt Nam', latitude: 21.3980, longitude: 105.2240 }],
    [/hà\s*nội|ha\s*noi|hanoi/i, { name: 'Hà Nội, Việt Nam', latitude: 21.0278, longitude: 105.8342 }],
    [/hồ\s*chí\s*minh|ho\s*chi\s*minh|sài\s*gòn|sai\s*gon|tp\s*hcm/i, { name: 'TP. Hồ Chí Minh, Việt Nam', latitude: 10.8231, longitude: 106.6297 }],
    [/đà\s*nẵng|da\s*nang/i, { name: 'Đà Nẵng, Việt Nam', latitude: 16.0544, longitude: 108.2022 }]
  ];
  for (const [re, loc] of known) {
    if (re.test(lower)) return loc;
  }

  let name = stripVietnameseWeatherWords(raw);
  if (!name || /^(ngoài trời|ngoai troi|việt nam|viet nam)$/i.test(name)) name = 'Hà Nội, Việt Nam';
  if (!/việt nam|viet nam|vietnam/i.test(name)) name += ', Việt Nam';
  return { name, latitude: null, longitude: null };
}

function weatherCodeVi(code) {
  const c = Number(code);
  const map = {
    0:'Trời quang', 1:'Ít mây', 2:'Có mây', 3:'Nhiều mây/u ám',
    45:'Sương mù', 48:'Sương mù đóng băng',
    51:'Mưa phùn nhẹ', 53:'Mưa phùn vừa', 55:'Mưa phùn dày',
    61:'Mưa nhỏ', 63:'Mưa vừa', 65:'Mưa to',
    66:'Mưa lạnh nhẹ', 67:'Mưa lạnh mạnh',
    71:'Tuyết nhẹ', 73:'Tuyết vừa', 75:'Tuyết dày',
    80:'Mưa rào nhẹ', 81:'Mưa rào vừa', 82:'Mưa rào mạnh',
    95:'Dông', 96:'Dông kèm mưa đá nhẹ', 99:'Dông kèm mưa đá mạnh'
  };
  return map[c] || 'Không rõ';
}

async function geocodeWeatherLocation(loc) {
  if (loc.latitude && loc.longitude) return loc;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc.name)}&count=1&language=vi&format=json`;
  const response = await withTimeout(fetch(url, { headers: { 'User-Agent': 'SyNamMysticAI/34 weather fix' } }), 12000);
  const json = await response.json().catch(() => ({}));
  const hit = json?.results?.[0];
  if (!hit?.latitude || !hit?.longitude) throw new Error('Không tìm thấy tọa độ địa điểm: ' + loc.name);
  const display = [hit.name, hit.admin1, hit.country].filter(Boolean).join(', ');
  return { name: display || loc.name, latitude: hit.latitude, longitude: hit.longitude };
}

async function directWeatherAnswerLegacy(message = '') {
  if (!isWeatherQuestion(message)) return null;
  const normalized = normalizeWeatherLocation(message);
  try {
    const loc = await geocodeWeatherLocation(normalized);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=Asia%2FBangkok&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3`;
    const response = await withTimeout(fetch(url, { headers: { 'User-Agent': 'SyNamMysticAI/34 weather fix' } }), 12000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const cur = data?.current || {};
    const daily = data?.daily || {};
    const lines = [
      `### 🌦️ Thời tiết ${loc.name}`,
      `- **Hiện tại:** ${Math.round(cur.temperature_2m ?? 0)}°C, cảm giác như ${Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0)}°C, ${weatherCodeVi(cur.weather_code)}.`,
      `- **Độ ẩm:** ${cur.relative_humidity_2m ?? '?'}% · **Gió:** ${cur.wind_speed_10m ?? '?'} km/h · **Mây:** ${cur.cloud_cover ?? '?'}%.`,
      `- **Hôm nay:** khoảng ${Math.round(daily.temperature_2m_min?.[0] ?? 0)}°C - ${Math.round(daily.temperature_2m_max?.[0] ?? 0)}°C, khả năng mưa cao nhất ${daily.precipitation_probability_max?.[0] ?? '?'}%.`
    ];
    if (daily.time?.[1]) lines.push(`- **Ngày mai (${daily.time[1]}):** khoảng ${Math.round(daily.temperature_2m_min?.[1] ?? 0)}°C - ${Math.round(daily.temperature_2m_max?.[1] ?? 0)}°C, ${weatherCodeVi(daily.weather_code?.[1])}.`);
    lines.push('', '_Nguồn: Open-Meteo theo tọa độ địa điểm, tránh lỗi nhầm Việt Trì thành địa danh khác._');
    return lines.join('\n');
  } catch (error) {
    const loc = normalized || { name: 'địa điểm bạn hỏi' };
    return [
      `### 🌦️ Thời tiết ${loc.name}`,
      `Mình đã nhận đúng địa điểm **${loc.name}**, nhưng server hiện chưa lấy được dữ liệu Open-Meteo trực tiếp.`,
      ``,
      `Nguyên nhân thường gặp: hosting chặn kết nối ra ngoài, mạng server lỗi tạm thời, hoặc API thời tiết bị timeout.`,
      ``,
      `Bạn thử lại sau vài giây. Lõi NAM34 đã chặn không cho AI trả lời lạc sang địa danh khác.`
    ].join('\\n');
  }
}

function chatHistoryToText(history, limit = 30) {
  if (!Array.isArray(history)) return '';
  const cleaned = history.slice(-limit)
    .filter(m => m && String(m.text || '').trim() && !/AI đang phân tích|Đang trả lời|typing/i.test(String(m.text || '')))
    .map(m => {
      const role = m.role === 'assistant' || m.role === 'model' || m.role === 'ai' ? 'AI' : 'Người dùng';
      const text = String(m.text || '')
        .replace(/Trả lời bởi:.*?(\n|$)/g, '')
        .replace(/🤖 Đặng Năm/g, '')
        .replace(/👤 .*?(Free|Pro|Guest)?/g, '')
        .replace(/👥 Khách/g, '')
        .trim()
        .slice(0, 2200);
      return text ? `${role}: ${text}` : '';
    })
    .filter(Boolean);
  return cleaned.join('\n');
}

function nam30MemoryRules() {
  return `
BỘ NHỚ HỘI THOẠI NAM30 - BẮT BUỘC:
- Hãy coi LỊCH SỬ HỘI THOẠI là ngữ cảnh thật của cuộc nói chuyện hiện tại.
- Nếu người dùng hỏi ngắn như: "tiếp", "nói rõ hơn", "câu 2", "ý trên", "vậy còn", "nó", "ở đó", "chỗ tôi", phải suy ra từ câu trước gần nhất.
- Không tự đổi chủ đề khi câu hỏi mới còn liên quan lịch sử.
- Nếu lịch sử có thông tin người dùng đã cung cấp như tên, địa điểm, phiên bản app, lỗi đang sửa... hãy dùng lại, không hỏi lại.
- Chỉ hỏi lại khi lịch sử thật sự không có thông tin cần thiết.
- Tuyệt đối không tự giới thiệu, tiết lộ hoặc nhắc tên model/provider/API đang chạy như Gemini, Groq, OpenRouter, OpenAI, Claude, DeepSeek, Qwen, Mistral, Grok, GPT, Llama.
- Khi cần nói về bản thân, chỉ xưng là Đặng Năm.
`;
}

function hideModelLeakServer(text = '') {
  let out = String(text || '');
  out = out.replace(/^\s*(Trả lời bởi|Powered by|Model|Provider)\s*[:：].*$/gmi, '');
  out = out.replace(/\b(?:tôi|mình|em|AI này)\s+(?:là|được chạy bằng|sử dụng|dựa trên|powered by)\s+(?:Google\s+)?(?:Gemini|Groq|OpenRouter|OpenAI|ChatGPT|GPT[-\w.]*|Claude|Anthropic|DeepSeek|Qwen|Mistral|Grok|Llama[-\w.]*)/gi, 'Mình là Đặng Năm');
  out = out.replace(/\b(?:Google\s+Gemini|Gemini|Groq|OpenRouter|OpenAI|ChatGPT|GPT-?4o(?:-mini)?|GPT-?4\.1(?:-mini)?|Claude|Anthropic|DeepSeek|Qwen|Mistral|Grok|Llama-?3(?:\.\d)?[-\w.]*)\b/gi, 'Đặng Năm');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

const CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const NAP_AM_60 = [
  'Hải Trung Kim','Hải Trung Kim','Lư Trung Hỏa','Lư Trung Hỏa','Đại Lâm Mộc','Đại Lâm Mộc','Lộ Bàng Thổ','Lộ Bàng Thổ','Kiếm Phong Kim','Kiếm Phong Kim',
  'Sơn Đầu Hỏa','Sơn Đầu Hỏa','Giản Hạ Thủy','Giản Hạ Thủy','Thành Đầu Thổ','Thành Đầu Thổ','Bạch Lạp Kim','Bạch Lạp Kim','Dương Liễu Mộc','Dương Liễu Mộc',
  'Tuyền Trung Thủy','Tuyền Trung Thủy','Ốc Thượng Thổ','Ốc Thượng Thổ','Tích Lịch Hỏa','Tích Lịch Hỏa','Tùng Bách Mộc','Tùng Bách Mộc','Trường Lưu Thủy','Trường Lưu Thủy',
  'Sa Trung Kim','Sa Trung Kim','Sơn Hạ Hỏa','Sơn Hạ Hỏa','Bình Địa Mộc','Bình Địa Mộc','Bích Thượng Thổ','Bích Thượng Thổ','Kim Bạch Kim','Kim Bạch Kim',
  'Phú Đăng Hỏa','Phú Đăng Hỏa','Thiên Hà Thủy','Thiên Hà Thủy','Đại Trạch Thổ','Đại Trạch Thổ','Thoa Xuyến Kim','Thoa Xuyến Kim','Tang Đố Mộc','Tang Đố Mộc',
  'Đại Khê Thủy','Đại Khê Thủy','Sa Trung Thổ','Sa Trung Thổ','Thiên Thượng Hỏa','Thiên Thượng Hỏa','Thạch Lựu Mộc','Thạch Lựu Mộc','Đại Hải Thủy','Đại Hải Thủy'
];
function elementFromNapAm(nap = '') {
  if (nap.includes('Kim')) return 'Kim';
  if (nap.includes('Mộc')) return 'Mộc';
  if (nap.includes('Thủy')) return 'Thủy';
  if (nap.includes('Hỏa')) return 'Hỏa';
  if (nap.includes('Thổ')) return 'Thổ';
  return 'Không rõ';
}
function parseBirthYear(birth) {
  const m = String(birth || '').match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}
function fixedLunarProfile(person = {}, idx = 1) {
  const birthDate = person.birthDate || person.birth || person.date || '';
  const year = parseBirthYear(birthDate);
  if (!year) return { name: person.name || `Người ${idx}`, birthDate, error: 'Thiếu năm sinh hợp lệ' };
  const cycleIndex = ((year - 1924) % 60 + 60) % 60;
  const canChi = `${CAN[((year - 4) % 10 + 10) % 10]} ${CHI[((year - 4) % 12 + 12) % 12]}`;
  const napAm = NAP_AM_60[cycleIndex];
  return { name: person.name || `Người ${idx}`, birthDate, year, canChi, napAm, nguHanh: elementFromNapAm(napAm), note: 'Can Chi/Nạp âm/Ngũ hành được tính cố định bằng code, AI không được tự tính lại.' };
}
// ===== END NAM27 CLEAN AI CORE STABLE FIX =====

function cleanError(error) {
  const msg = error?.message || "Có lỗi không xác định.";
  const lower = msg.toLowerCase();
  if (msg.includes("TIMEOUT_GEMINI")) return "Gemini phản hồi quá lâu. Kiểm tra mạng, quota hoặc thử lại bằng model nhẹ hơn.";
  if (lower.includes("api key") || lower.includes("apikey") || lower.includes("permission") || lower.includes("unauthorized")) return "API key Gemini sai, thiếu quyền, hoặc chưa được thêm đúng vào file .env.";
  if (lower.includes("quota") || lower.includes("rate") || lower.includes("429")) return "API key Gemini hết quota, bị giới hạn tốc độ hoặc tài khoản đang bị giới hạn.";
  if (lower.includes("404") || lower.includes("not found") || lower.includes("model")) return "Model Gemini không khả dụng với API key này. Server đã thử model dự phòng nhưng vẫn lỗi.";
  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("econn") || lower.includes("enotfound")) return "Server Node không kết nối được tới Gemini. Kiểm tra mạng, proxy/VPN, DNS hoặc tường lửa.";
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

  const finalError = lastError || new Error("Không có model Gemini nào để thử.");
  finalError.attempts = attempts;
  throw finalError;
}

app.get("/api", (req, res) => {
  res.json({ ok: true, app: "SyNam Mystic NAM52", routes: ["/api/health", "/api/models", "/api/ai/providers", "/api/multi-ai/chat", "/api/auth/register", "/api/auth/login", "/api/auth/social", "/api/auth/me", "/api/auth/firebase-config"] });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim() || "Thành viên";
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
    for (const id of Object.keys(AI_PROVIDERS)) {
      if (Object.prototype.hasOwnProperty.call(keys, id)) {
        const value = String(keys[id] || "").trim();
        if (value) saved.aiKeys[id] = value;
      }
      if (Object.prototype.hasOwnProperty.call(models, id)) {
        const value = String(models[id] || "").trim();
        if (value) saved.aiModels[id] = value;
      }
    }
    await writeUsers(users);
    res.json({ ok: true, providers: enabledProvidersForUser(saved), note: "Đã lưu API key cá nhân vào data/users.json. Bản demo chưa mã hóa key, chỉ dùng test cá nhân." });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});


// NAM34: route thời tiết riêng để AI Chat lấy trực tiếp trước khi gọi model.
app.post("/api/weather", async (req, res) => {
  try {
    const { message } = req.body || {};
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return res.status(400).json({ error: "Thiếu câu hỏi thời tiết." });
    const answer = await directWeatherAnswer(cleanMessage);
    if (!answer) return res.status(400).json({ error: "Không phải câu hỏi thời tiết." });
    res.json({ ok: true, provider: "local", label: "Đặng Năm Weather Core", model: "hidden", text: answer });
  } catch (error) {
    res.status(500).json({ error: cleanError(error) });
  }
});

app.post("/api/multi-ai/chat", async (req, res) => {
  try {
    const user = await currentUserFromRequest(req).catch(() => null);
    const { message, provider = "auto", model = "", council = false, context, history } = req.body || {};
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return res.status(400).json({ error: "Bạn cần nhập câu hỏi cho Multi-AI." });

    const weatherAnswer = await directWeatherAnswer(cleanMessage);
    if (weatherAnswer) {
      return res.json({ ok: true, provider: "local", label: "Đặng Năm Weather Core", model: "local-live-weather", text: weatherAnswer });
    }

    const dateAnswer = directDateTimeAnswer(cleanMessage);
    if (dateAnswer) {
      return res.json({ ok: true, provider: "local", label: "Đặng Năm", model: "local-date-time", text: dateAnswer });
    }

    const historyText = chatHistoryToText(history, 24);
    const prompt = `Bạn là Đặng Năm trong app SyNam Mystic. Hãy trả lời như một trợ lý AI chuyên nghiệp kiểu ChatGPT/Gemini: chính xác, đi thẳng vào vấn đề, có cấu trúc rõ, không nói lan man, không bịa.

THỜI GIAN HỆ THỐNG VIỆT NAM:
- Hôm nay: ${formatVietnamDate(0)}
- Ngày mai: ${formatVietnamDate(1)}
- Ngày kia: ${formatVietnamDate(2)}

QUY TẮC BẮT BUỘC:
${nam30MemoryRules()}
- Luôn bám theo lịch sử hội thoại bên dưới nếu câu hỏi mới có liên quan câu trước.
- Không hỏi ngược người dùng hôm nay là ngày nào/thứ mấy; dữ liệu thời gian đã có ở trên.
- Nếu câu hỏi là ngày giờ đơn giản, trả lời trực tiếp theo thời gian hệ thống.
- Câu hỏi thời tiết đã có lõi riêng xử lý trước khi gọi AI; nếu vẫn nhận câu thời tiết thì không được bịa, hãy yêu cầu địa điểm cụ thể hoặc nói thiếu dữ liệu thời tiết trực tiếp.
- Ưu tiên trả lời ngắn gọn trước, sau đó mới giải thích chi tiết khi cần.
- Với câu hỏi kỹ thuật/app/code: đưa từng bước làm được ngay, kèm lỗi thường gặp và cách kiểm tra.
- Với câu hỏi cần thông tin mới theo thời gian thực mà app không có API riêng: nói rõ app chưa có dữ liệu trực tiếp, không tự đoán.
- Với câu hỏi mơ hồ: nêu giả định hợp lý rồi trả lời; chỉ hỏi lại khi thật sự không thể trả lời.
- Không bịa dữ kiện. Nếu thiếu dữ liệu thật sự, nói rõ thiếu dữ liệu nào.
- Không tiết lộ model/provider/API. Không nói các câu như 'tôi là Gemini/GPT/Claude'. Chỉ xưng là Đặng Năm. Với nội dung Mystic luôn nhắc đây là tham khảo/giải trí, không phán chắc chắn.

NGỮ CẢNH APP:
${context ? JSON.stringify(context, null, 2).slice(0, 4000) : "Không có"}

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
${historyText || "Chưa có"}

CÂU HỎI MỚI:
${cleanMessage}`;
    const result = await tryMultiAI({ prompt, parts: [{ text: prompt }], preferredProvider: provider || process.env.DEFAULT_AI_PROVIDER || "auto", requestedModel: model, user, council: Boolean(council) });
    result.text = hideModelLeakServer(result.text);
    res.json({ ok: true, provider: 'synam', label: 'Đặng Năm', text: result.text });
  } catch (error) {
    res.status(500).json({ ok: false, error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    models: MODELS,
    defaultModel: process.env.GEMINI_MODEL || "auto",
    imageModels: resolveImageModelOrder("auto"),
    imageModel: resolveImageModelOrder("auto")[0] || "auto",
    multiAIProviders: enabledProvidersForUser(null).map(p => ({ id: p.id, label: p.label, configured: p.configured, model: p.model })),
    app: "SyNam Mystic NAM52"
  });
});

app.get("/api/models", (req, res) => {
  res.json({
    ok: true,
    chatModels: MODELS,
    imageModels: resolveImageModelOrder("auto"),
    activeImageModel: resolveImageModelOrder("auto")[0] || "auto",
    note: "Có thể đổi GEMINI_IMAGE_MODEL hoặc GEMINI_IMAGE_MODELS trong .env mà không cần sửa server.js."
  });
});

app.get("/api/gemini-check", async (req, res) => {
  try {
    if (!ai) return res.status(400).json({ error: "Chưa có GEMINI_API_KEY trong file .env." });
    const preferredModel = req.query.model || "auto";
    const result = await tryModels([{ text: "Trả lời ngắn gọn: OK" }], preferredModel);
    res.json({ ok: true, model: result.model, text: result.text });
  } catch (error) {
    res.status(500).json({ ok: false, error: cleanError(error), attempts: error.attempts || [] });
  }
});


app.post("/api/vision-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({
        error: "Chưa có GEMINI_API_KEY. Phần xem ảnh AI cần server Gemini."
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
    result.text = hideModelLeakServer(result.text);
    res.json({ ok: true, label: 'Đặng Năm', text: result.text });
  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.post("/api/chat-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({ error: "Chưa có GEMINI_API_KEY. Chatbot AI cần server Gemini." });
    }

    const { message, attachments, context, history, geminiModel } = req.body || {};
    const cleanMessage = String(message || "").trim();
    const files = Array.isArray(attachments) ? attachments.slice(0, 6) : [];

    if (!cleanMessage && files.length === 0) {
      return res.status(400).json({ error: "Bạn cần nhập câu hỏi hoặc tải ảnh/file lên trước." });
    }

    const weatherAnswer = files.length === 0 ? await directWeatherAnswer(cleanMessage) : null;
    if (weatherAnswer) {
      return res.json({ ok: true, model: "local-live-weather", label: "Đặng Năm Weather Core", text: weatherAnswer });
    }

    const dateAnswer = directDateTimeAnswer(cleanMessage);
    if (dateAnswer && files.length === 0) {
      return res.json({ ok: true, model: "local-date-time", text: dateAnswer });
    }

    const historyText = chatHistoryToText(history, 24);

    const contextText = context ? JSON.stringify(context, null, 2).slice(0, 6000) : "Không có";

    const parts = [{ text: `
Bạn là Đặng Năm trong app SyNam Mystic. Phong cách trả lời phải giống một trợ lý AI chuyên nghiệp kiểu ChatGPT/Gemini: hiểu đúng ý, trả lời có cấu trúc, thực tế, không vòng vo, không bịa. Không tiết lộ model, provider, API, tên nền tảng AI đang chạy. Bạn không phải là Đặng Năm và không tự nhận là Đặng Năm.

THỜI GIAN HỆ THỐNG VIỆT NAM:
- Hiện tại: ${currentVietnamTime()}
- Hôm nay: ${formatVietnamDate(0)}
- Ngày mai: ${formatVietnamDate(1)}
- Ngày kia: ${formatVietnamDate(2)}

QUY TẮC:
${nam30MemoryRules()}
- Trả lời bằng tiếng Việt tự nhiên, dễ hiểu, có Markdown đẹp.
- Mở đầu bằng câu trả lời trực tiếp, sau đó trình bày theo mục rõ ràng nếu cần.
- Không trả lời chung chung. Phải đưa bước làm, ví dụ, checklist hoặc kết luận cụ thể tùy câu hỏi.
- Với câu hỏi kỹ thuật/app/code: ưu tiên cách sửa thực tế, chỉ rõ file/hàm/chỗ cần đổi nếu biết.
- Với câu hỏi cần dữ liệu mới theo thời gian thực mà app không có API riêng: nói rõ chưa có dữ liệu trực tiếp, không tự đoán.
- Có thể phân tích ảnh/file người dùng tải lên nếu file đọc được.
- Nếu file không đủ dữ liệu để đọc, hãy nói rõ và hướng dẫn người dùng gửi file dạng txt/csv/json/md hoặc ảnh rõ hơn.
- Không bịa nội dung file nếu không đọc được.
- Với nội dung tử vi/xem tướng, chỉ xem là tham khảo văn hóa, không phán chắc số phận/sức khỏe/tài chính/pháp lý.
- Nếu câu hỏi là kỹ thuật, trả lời theo từng bước cụ thể.
- Luôn bám theo LỊCH SỬ CHAT GẦN ĐÂY nếu câu hỏi mới liên quan câu trước.
- Không hỏi ngược người dùng hôm nay/ngày mai là thứ mấy; dữ liệu thời gian đã có ở trên.
- Câu hỏi thời tiết đã có lõi riêng xử lý trước khi gọi AI; nếu vẫn nhận câu thời tiết thì không được bịa, hãy yêu cầu địa điểm cụ thể hoặc nói thiếu dữ liệu thời tiết trực tiếp.
- Không bịa dữ kiện; thiếu dữ liệu thì nói rõ thiếu gì.
- Không tiết lộ model/provider/API. Không nói các câu như 'tôi là Gemini/GPT/Claude'. Chỉ xưng là Đặng Năm. Với nội dung Mystic luôn nhắc đây là tham khảo/giải trí, không phán chắc chắn.

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
    result.text = hideModelLeakServer(result.text);
    res.json({ ok: true, label: 'Đặng Năm', text: result.text });
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
      const err = new Error("Model không trả ảnh. Có thể API key chưa được cấp quyền tạo/chỉnh ảnh hoặc model không hỗ trợ image output.");
      err.responseText = extracted.text;
      throw err;
    } catch (err) {
      const reason = cleanError(err);
      console.log("Image model lỗi:", model, err.message);
      attempts.push({ model, error: reason });
      lastError = err;
    }
  }
  const finalError = lastError || new Error("Không có model Gemini tạo ảnh nào để thử.");
  finalError.attempts = attempts;
  finalError.message = `${cleanError(finalError)} | Đã thử model ảnh: ${attempts.map(a => `${a.model}: ${a.error}`).join(" ; ") || "không có"}`;
  throw finalError;
}

app.post("/api/image-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({ error: "Chưa có GEMINI_API_KEY. Tạo/chỉnh ảnh AI cần Gemini API thật." });
    }
    const { mode, prompt, image, attachments, geminiModel } = req.body || {};
    const cleanPrompt = String(prompt || "").trim();
    const isEdit = mode === "edit";
    const files = Array.isArray(attachments) ? attachments.slice(0, 3) : [];
    const mainImage = image || files.find(f => String(f.type || "").startsWith("image/"))?.dataUrl || "";

    if (!cleanPrompt) return res.status(400).json({ error: "Bạn cần nhập mô tả ảnh hoặc yêu cầu chỉnh sửa." });
    if (isEdit && !mainImage) return res.status(400).json({ error: "Chế độ chỉnh sửa ảnh cần tải ảnh gốc lên trước." });

    const parts = [{ text: `
Bạn là module TẠO ẢNH / CHỈNH SỬA ẢNH AI trong app SyNam Mystic.
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
    if (!ai) return res.status(400).json({ error: "Chưa có GEMINI_API_KEY. Đặng Năm AI cần server Gemini." });
    const { message, context, geminiModel } = req.body || {};
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return res.status(400).json({ error: "Bạn cần nhập câu hỏi trước." });
    const contextText = context ? JSON.stringify(context, null, 2).slice(0, 7000) : "Không có";
    const parts = [{ text: `
Bạn là "Đặng Năm" trong app SyNam Mystic. Hãy trả lời bằng tiếng Việt, giọng ấm áp, gần gũi, có màu sắc huyền học nhưng không mê tín cực đoan.

QUY TẮC:
- Đây là module riêng của Đặng Năm, không phải chatbot Hỏi và Đáp AI.
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
    result.text = hideModelLeakServer(result.text);
    res.json({ ok: true, label: 'Đặng Năm', text: result.text });
  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.post("/api/love-ai", async (req, res) => {
  try {
    if (!ai) return res.status(400).json({ error: "Chưa có GEMINI_API_KEY. AI tình duyên cần server Gemini." });
    const body = req.body || {};
    const { persons, focus, localReport, geminiModel, name1, birth1, name2, birth2 } = body;
    const finalPersons = persons || [{name:name1||"Người 1", birthDate:birth1||""},{name:name2||"Người 2", birthDate:birth2||""}];
    const fixedProfiles = finalPersons.map((p, i) => fixedLunarProfile(p, i + 1));
    const fixedSummary = fixedProfiles.map(p => `- ${p.name}: ${p.birthDate || 'chưa nhập'} => ${p.year || 'thiếu năm'}${p.canChi ? `, tuổi ${p.canChi}, nạp âm ${p.napAm}, ngũ hành ${p.nguHanh}` : ''}`).join("\n");
    const parts = [{ text: `
Bạn là chuyên gia luận TÌNH DUYÊN/HỢP TUỔI bằng tiếng Việt trong app SyNam Mystic. Hãy viết chi tiết, rõ ràng, có cấu trúc đẹp.

THỜI GIAN HIỆN TẠI TẠI VIỆT NAM: ${currentVietnamTime()}

DỮ LIỆU NỀN ĐÃ ĐƯỢC CODE TÍNH CỐ ĐỊNH - TUYỆT ĐỐI KHÔNG TỰ TÍNH LẠI:
${fixedSummary}

JSON DỮ LIỆU NỀN:
${JSON.stringify(fixedProfiles, null, 2)}

QUY TẮC BẮT BUỘC:
- Không được tự đổi Can Chi/Nạp âm/Ngũ hành. Ví dụ 2004 là Giáp Thân, không được nói Giáp Thìn.
- Nếu người dùng nhập thiếu/ngày sinh sai định dạng, nói rõ thiếu dữ liệu thay vì bịa.
- AI chỉ được luận giải dựa trên DỮ LIỆU NỀN ĐÃ ĐƯỢC CODE TÍNH CỐ ĐỊNH ở trên.
- Có mục điểm mạnh, điểm dễ xung đột, cách hóa giải/hòa hợp, lời khuyên thực tế. Viết nhiều lớp, không trả lời cụt.
- Không phán chắc cưới/ly hôn/chia tay/giàu nghèo/số phận. Chỉ nói theo hướng tham khảo văn hóa và tự nhận thức.
- Nếu dữ liệu thiếu giờ sinh thì nói rõ phần giờ sinh chỉ tham khảo/không có.
- Trả về Markdown đẹp.

DỮ LIỆU GỐC NGƯỜI DÙNG NHẬP:
${JSON.stringify(finalPersons, null, 2)}

TRỌNG TÂM MUỐN XEM:
${focus || "tong-quan"}

BẢN LOCAL NỀN:
${localReport || ""}

Hãy trả về thật chi tiết theo cấu trúc chuyên sâu:
1. Bảng tổng quan 2 người: tên, ngày sinh, năm sinh, can chi, nạp âm, ngũ hành
2. Tóm tắt nhanh mức độ hòa hợp bằng thang 10 điểm, kèm giải thích vì sao
3. Lớp 1 - Nền tính cách: mỗi người yêu theo kiểu nào, cần gì trong tình cảm
4. Lớp 2 - Can Chi/Địa Chi: điểm thuận, điểm cần tiết chế, tuyệt đối không tự đổi dữ liệu code đã tính
5. Lớp 3 - Ngũ hành/Nạp âm: tương sinh, tương khắc, cách cân bằng thực tế
6. Lớp 4 - Giao tiếp: ai dễ im lặng, ai dễ tổn thương, cách nói chuyện bớt hiểu lầm
7. Lớp 5 - Điểm hút nhau: vì sao hai người có thể bị thu hút
8. Lớp 6 - Điểm dễ xung đột: thói quen, kỳ vọng, cảm xúc, nhịp sống
9. Lớp 7 - Khả năng đồng hành lâu dài: điều kiện để bền, không phán chắc cưới/chia tay
10. Lớp 8 - Lời khuyên 30 ngày: 5 việc nên làm và 5 việc nên tránh
11. Kết luận mềm: nói như một bài tư vấn tình cảm ấm áp, có chiều sâu
12. Lưu ý tham khảo/giải trí, không thay thế quyết định thực tế
` }];
    const result = await tryModels(parts, geminiModel);
    result.text = hideModelLeakServer(result.text);
    res.json({ ok: true, label: 'Đặng Năm', text: result.text });
  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});

app.post("/api/mystic-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({
        error: "Chưa có GEMINI_API_KEY. App vẫn chạy bản local, nhưng AI luận giải dài cần server Gemini."
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
- Viết dài, mạch lạc, chia mục rõ như bài tư vấn chuyên nghiệp, tối thiểu 900-1500 từ nếu dữ liệu đủ.
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

Hãy viết bài luận giải cuối cùng THẬT CHI TIẾT theo cấu trúc:
1. Bảng tổng quan bản mệnh: họ tên, ngày sinh, giờ sinh, giới tính, can chi/năm sinh, ngũ hành, cung hoàng đạo, dữ liệu thiếu nếu có
2. Tổng quan khí chất: tính cách bên ngoài, thế giới nội tâm, cách phản ứng khi áp lực
3. Đông phương chuyên sâu: âm dương, ngũ hành, can chi, nạp âm/cung phi nếu có dữ liệu; giải thích dễ hiểu, không bịa khi thiếu dữ liệu
4. Tử vi đời sống: công việc, tài chính, tình cảm, gia đình, quan hệ xã hội, tinh thần
5. Chiêm tinh phương Tây: cung hoàng đạo, nguyên tố, ưu điểm, bóng tối tính cách, cách yêu, cách làm việc
6. Thần số học liên quan nếu có ngày sinh/tên: số chủ đạo hoặc khuynh hướng phát triển, bài học cần vượt
7. Tướng số & khí chất đặc trưng: chỉ nhận xét phong thái chung nếu có ghi chú/ảnh, không định danh, không kết luận sức khỏe/tuổi thọ/giàu nghèo
8. Chỉ tay/khuôn mặt nếu có ảnh hoặc ghi chú: nhận xét thận trọng theo hướng tự nhận thức
9. Giai đoạn hiện tại: điều nên tập trung trong 7 ngày, 30 ngày và 3 tháng tới
10. Lời khuyên thực tế: 5 việc nên làm, 5 việc nên tránh
11. Kết luận ấm áp: viết như một bài tư vấn riêng, có chiều sâu cảm xúc
12. Lưu ý về độ tin cậy và tính tham khảo/giải trí
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
    result.text = hideModelLeakServer(result.text);
    res.json({ ok: true, label: 'Đặng Năm', text: result.text });

  } catch (error) {
    res.status(500).json({ error: cleanError(error), attempts: error.attempts || [] });
  }
});


// ===== NAM36 WEATHER REAL FALLBACK + NO TECH ERROR =====
function weatherCodeViNam36(code) {
  const m = {0:'Trời quang',1:'Ít mây',2:'Có mây',3:'Nhiều mây/u ám',45:'Sương mù',48:'Sương mù',51:'Mưa phùn nhẹ',53:'Mưa phùn vừa',55:'Mưa phùn dày',61:'Mưa nhỏ',63:'Mưa vừa',65:'Mưa to',80:'Mưa rào nhẹ',81:'Mưa rào vừa',82:'Mưa rào mạnh',95:'Dông',96:'Dông kèm mưa đá',99:'Dông kèm mưa đá'};
  return m[Number(code)] || 'Không rõ';
}
function weatherLocNam36(message=''){
  const q=String(message||'').toLowerCase().normalize('NFC');
  const known=[
    [/việt\s*trì|viet\s*tri|vinh\s*que/i,{name:'Việt Trì, Phú Thọ, Việt Nam',latitude:21.3227,longitude:105.4020,wttr:'Viet Tri, Phu Tho, Vietnam'}],
    [/phú\s*thọ|phu\s*tho/i,{name:'Phú Thọ, Việt Nam',latitude:21.3980,longitude:105.2240,wttr:'Phu Tho, Vietnam'}],
    [/hà\s*nội|ha\s*noi|hanoi/i,{name:'Hà Nội, Việt Nam',latitude:21.0278,longitude:105.8342,wttr:'Hanoi, Vietnam'}],
    [/hồ\s*chí\s*minh|ho\s*chi\s*minh|sài\s*gòn|sai\s*gon|tp\s*hcm/i,{name:'TP. Hồ Chí Minh, Việt Nam',latitude:10.8231,longitude:106.6297,wttr:'Ho Chi Minh City, Vietnam'}],
    [/đà\s*nẵng|da\s*nang/i,{name:'Đà Nẵng, Việt Nam',latitude:16.0544,longitude:108.2022,wttr:'Da Nang, Vietnam'}]
  ];
  for(const [re,loc] of known){ if(re.test(q)) return loc; }
  return {name:'Hà Nội, Việt Nam',latitude:21.0278,longitude:105.8342,wttr:'Hanoi, Vietnam'};
}
function formatOpenMeteoNam36(loc,data){
  const cur=data?.current||{};
  const daily=data?.daily||{};
  const lines=[
    `### 🌦️ Thời tiết ${loc.name}`,
    `- **Hiện tại:** ${Math.round(cur.temperature_2m ?? 0)}°C, cảm giác như ${Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0)}°C, ${weatherCodeViNam36(cur.weather_code)}.`,
    `- **Độ ẩm:** ${cur.relative_humidity_2m ?? '?'}% · **Gió:** ${cur.wind_speed_10m ?? '?'} km/h · **Mây:** ${cur.cloud_cover ?? '?'}%.`,
    `- **Hôm nay:** khoảng ${Math.round(daily.temperature_2m_min?.[0] ?? 0)}°C - ${Math.round(daily.temperature_2m_max?.[0] ?? 0)}°C, khả năng mưa cao nhất ${daily.precipitation_probability_max?.[0] ?? '?'}%.`
  ];
  if(daily.time?.[1]) lines.push(`- **Ngày mai (${daily.time[1]}):** khoảng ${Math.round(daily.temperature_2m_min?.[1] ?? 0)}°C - ${Math.round(daily.temperature_2m_max?.[1] ?? 0)}°C, ${weatherCodeViNam36(daily.weather_code?.[1])}.`);
  lines.push('', '_Nguồn: Open-Meteo theo tọa độ địa điểm._');
  return lines.join('\n');
}
function pickWeatherDescNam36(condition=[]){
  const first=Array.isArray(condition)?condition[0]:null;
  return first?.lang_vi?.[0]?.value || first?.value || 'Không rõ';
}
function formatWttrNam36(loc,data){
  const cur=data?.current_condition?.[0]||{};
  const today=data?.weather?.[0]||{};
  const tomorrow=data?.weather?.[1]||{};
  const lines=[
    `### 🌦️ Thời tiết ${loc.name}`,
    `- **Hiện tại:** ${cur.temp_C ?? '?'}°C, cảm giác như ${cur.FeelsLikeC ?? '?'}°C, ${pickWeatherDescNam36(cur.weatherDesc)}.`,
    `- **Độ ẩm:** ${cur.humidity ?? '?'}% · **Gió:** ${cur.windspeedKmph ?? '?'} km/h · **Mây:** ${cur.cloudcover ?? '?'}%.`,
    `- **Hôm nay:** khoảng ${today.mintempC ?? '?'}°C - ${today.maxtempC ?? '?'}°C.`
  ];
  if(tomorrow?.date) lines.push(`- **Ngày mai (${tomorrow.date}):** khoảng ${tomorrow.mintempC ?? '?'}°C - ${tomorrow.maxtempC ?? '?'}°C.`);
  lines.push('', '_Nguồn dự phòng: wttr.in._');
  return lines.join('\n');
}
async function directWeatherAnswer(message = '') {
  if (!isWeatherQuestion(message)) return null;
  const loc=weatherLocNam36(message);
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=Asia%2FBangkok&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3`;
    const r=await withTimeout(fetch(url,{headers:{'User-Agent':'SyNamMysticAI/36 weather fix'}}),15000);
    if(!r.ok) throw new Error('OPEN_METEO_HTTP_'+r.status);
    return formatOpenMeteoNam36(loc, await r.json());
  }catch(_openMeteoErr){
    try{
      const url=`https://wttr.in/${encodeURIComponent(loc.wttr||loc.name)}?format=j1&lang=vi`;
      const r=await withTimeout(fetch(url,{headers:{'User-Agent':'SyNamMysticAI/36 weather fallback'}}),15000);
      if(!r.ok) throw new Error('WTTR_HTTP_'+r.status);
      return formatWttrNam36(loc, await r.json());
    }catch(_wttrErr){
      return [
        `### 🌦️ Thời tiết ${loc.name}`,
        `Mình đã nhận đúng địa điểm **${loc.name}**. Hiện máy chủ chưa lấy được dữ liệu thời tiết trực tiếp ngay lúc này.`,
        ``,
        `Bạn bấm gửi lại sau vài giây, hoặc thử trên trình duyệt khác. App sẽ ưu tiên Open-Meteo, sau đó tự chuyển sang nguồn dự phòng và không trả lời lạc sang địa danh khác.`
      ].join('\n');
    }
  }
}
// ===== END NAM36 WEATHER REAL FALLBACK =====

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 SyNam Mystic hoạt động thành công trên port ${PORT}.`);
});
