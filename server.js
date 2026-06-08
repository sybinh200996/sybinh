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
      ...(provider === "openrouter" ? { "HTTP-Referer": "https://synam-ai.local", "X-Title": "Sỹ Năm Mystic AI" } : {})
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
    const text = results.map(r => `## ${r.label} (${r.model})\n${r.text}`).join("\n\n---\n\n");
    return { provider: "council", label: "Hội Đồng AI", model: results.map(r => r.model).join(", "), text, results, attempts };
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

function normalizeWeatherLocation(message = '') {
  const raw = String(message || '').trim();
  const q = raw.toLowerCase().normalize('NFC');
  let loc = '';
  const patterns = [
    /(?:thời tiết|thoi tiet|dự báo|du bao|nhiệt độ|nhiet do)\s+(?:ở|o|tại|tai|cho|khu vực|khu vuc)?\s*([^?.,!\n]+)/i,
    /(?:ở|o|tại|tai)\s+([^?.,!\n]+)\s*(?:hôm nay|hom nay|ngày mai|ngay mai|3 ngày|ba ngày|tuần này|tuan nay)?/i
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m && m[1]) { loc = m[1].trim(); break; }
  }
  loc = loc
    .replace(/^(hôm nay|hom nay|ngày mai|ngay mai|bây giờ|bay gio)\s+/i, '')
    .replace(/\s+(hôm nay|hom nay|ngày mai|ngay mai|bây giờ|bay gio|như thế nào|the nao|ra sao)$/i, '')
    .trim();
  if (!loc || /^(hôm nay|hom nay|ngày mai|ngay mai|bây giờ|bay gio|ngoài trời|ngoai troi)$/i.test(loc)) loc = 'Hanoi, Vietnam';
  const map = {
    'hà nội': 'Hanoi, Vietnam', 'ha noi': 'Hanoi, Vietnam', 'hanoi': 'Hanoi, Vietnam',
    'tp hcm': 'Ho Chi Minh City, Vietnam', 'hồ chí minh': 'Ho Chi Minh City, Vietnam', 'ho chi minh': 'Ho Chi Minh City, Vietnam', 'sài gòn': 'Ho Chi Minh City, Vietnam', 'sai gon': 'Ho Chi Minh City, Vietnam',
    'phú thọ': 'Phu Tho, Vietnam', 'phu tho': 'Phu Tho, Vietnam',
    'việt nam': 'Vietnam', 'viet nam': 'Vietnam'
  };
  const key = loc.toLowerCase().normalize('NFC');
  return map[key] || loc;
}

function pickWeatherDesc(condition = []) {
  const first = Array.isArray(condition) ? condition[0] : null;
  return first?.lang_vi?.[0]?.value || first?.value || 'Không rõ';
}

async function directWeatherAnswer(message = '') {
  if (!isWeatherQuestion(message)) return null;
  const location = normalizeWeatherLocation(message);
  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=vi`;
  try {
    const response = await withTimeout(fetch(url, { headers: { 'User-Agent': 'SyNamMysticAI/28 weather fix' } }), 12000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const area = data?.nearest_area?.[0];
    const place = [area?.areaName?.[0]?.value, area?.region?.[0]?.value, area?.country?.[0]?.value].filter(Boolean).join(', ') || location;
    const cur = data?.current_condition?.[0] || {};
    const today = data?.weather?.[0] || {};
    const tomorrow = data?.weather?.[1] || {};
    const lines = [
      `### 🌦️ Thời tiết ${place}`,
      `- **Hiện tại:** ${cur.temp_C ?? '?'}°C, cảm giác như ${cur.FeelsLikeC ?? '?'}°C, ${pickWeatherDesc(cur.weatherDesc)}.`,
      `- **Độ ẩm:** ${cur.humidity ?? '?'}% · **Gió:** ${cur.windspeedKmph ?? '?'} km/h · **Mây:** ${cur.cloudcover ?? '?'}%.`,
      `- **Hôm nay:** khoảng ${today.mintempC ?? '?'}°C - ${today.maxtempC ?? '?'}°C, khả năng mưa theo giờ có thể thay đổi.`,
    ];
    if (tomorrow?.date) lines.push(`- **Ngày mai (${tomorrow.date}):** khoảng ${tomorrow.mintempC ?? '?'}°C - ${tomorrow.maxtempC ?? '?'}°C.`);
    lines.push('', '_Nguồn thời tiết lấy trực tiếp lúc hỏi; nếu cần chính xác theo xã/huyện, hãy hỏi kèm địa điểm cụ thể._');
    return lines.join('\n');
  } catch (error) {
    return `### 🌦️ Thời tiết\nMình chưa lấy được dữ liệu thời tiết trực tiếp cho **${location}** lúc này.\n\nBạn thử hỏi rõ hơn như: **“Thời tiết Hà Nội hôm nay”**, **“Thời tiết Phú Thọ ngày mai”** hoặc kiểm tra mạng/API trên server. Lõi app đã nhận diện đây là câu hỏi thời tiết nên sẽ không trả lời lạc sang ngày/giờ nữa.`;
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
        .replace(/🤖 Sỹ Năm AI/g, '')
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
`;
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

app.post("/api/multi-ai/chat", async (req, res) => {
  try {
    const user = await currentUserFromRequest(req).catch(() => null);
    const { message, provider = "auto", model = "", council = false, context, history } = req.body || {};
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return res.status(400).json({ error: "Bạn cần nhập câu hỏi cho Multi-AI." });

    const weatherAnswer = await directWeatherAnswer(cleanMessage);
    if (weatherAnswer) {
      return res.json({ ok: true, provider: "local", label: "Sỹ Năm Weather Core", model: "local-live-weather", text: weatherAnswer });
    }

    const dateAnswer = directDateTimeAnswer(cleanMessage);
    if (dateAnswer) {
      return res.json({ ok: true, provider: "local", label: "Sỹ Năm AI", model: "local-date-time", text: dateAnswer });
    }

    const historyText = chatHistoryToText(history, 24);
    const prompt = `Bạn là Sỹ Năm AI trong app Sỹ Năm Mystic. Trả lời bằng tiếng Việt, rõ ràng, có Markdown đẹp.

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
- Không bịa dữ kiện. Nếu thiếu dữ liệu thật sự, nói rõ thiếu dữ liệu nào.

NGỮ CẢNH APP:
${context ? JSON.stringify(context, null, 2).slice(0, 4000) : "Không có"}

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
${historyText || "Chưa có"}

CÂU HỎI MỚI:
${cleanMessage}`;
    const result = await tryMultiAI({ prompt, parts: [{ text: prompt }], preferredProvider: provider || process.env.DEFAULT_AI_PROVIDER || "auto", requestedModel: model, user, council: Boolean(council) });
    res.json({ ok: true, ...result });
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
    app: "Sỹ Năm Mystic AI NAM30 Memory Pro"
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
    res.json(result);
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
      return res.json({ ok: true, model: "local-live-weather", label: "Sỹ Năm Weather Core", text: weatherAnswer });
    }

    const dateAnswer = directDateTimeAnswer(cleanMessage);
    if (dateAnswer && files.length === 0) {
      return res.json({ ok: true, model: "local-date-time", text: dateAnswer });
    }

    const historyText = chatHistoryToText(history, 24);

    const contextText = context ? JSON.stringify(context, null, 2).slice(0, 6000) : "Không có";

    const parts = [{ text: `
Bạn là chatbot Gemini AI thật trong app Sỹ Năm Mystic Ultimate Pro, nói chuyện tự nhiên, rõ ràng, hữu ích. Bạn không phải là thầy Sỹ Năm và không tự nhận là thầy Sỹ Năm.

THỜI GIAN HỆ THỐNG VIỆT NAM:
- Hiện tại: ${currentVietnamTime()}
- Hôm nay: ${formatVietnamDate(0)}
- Ngày mai: ${formatVietnamDate(1)}
- Ngày kia: ${formatVietnamDate(2)}

QUY TẮC:
${nam30MemoryRules()}
- Trả lời bằng tiếng Việt, dễ hiểu, có Markdown đẹp.
- Có thể phân tích ảnh/file người dùng tải lên nếu file đọc được.
- Nếu file không đủ dữ liệu để đọc, hãy nói rõ và hướng dẫn người dùng gửi file dạng txt/csv/json/md hoặc ảnh rõ hơn.
- Không bịa nội dung file nếu không đọc được.
- Với nội dung tử vi/xem tướng, chỉ xem là tham khảo văn hóa, không phán chắc số phận/sức khỏe/tài chính/pháp lý.
- Nếu câu hỏi là kỹ thuật, trả lời theo từng bước cụ thể.
- Luôn bám theo LỊCH SỬ CHAT GẦN ĐÂY nếu câu hỏi mới liên quan câu trước.
- Không hỏi ngược người dùng hôm nay/ngày mai là thứ mấy; dữ liệu thời gian đã có ở trên.
- Câu hỏi thời tiết đã có lõi riêng xử lý trước khi gọi AI; nếu vẫn nhận câu thời tiết thì không được bịa, hãy yêu cầu địa điểm cụ thể hoặc nói thiếu dữ liệu thời tiết trực tiếp.
- Không bịa dữ kiện; thiếu dữ liệu thì nói rõ thiếu gì.

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
    if (!ai) return res.status(400).json({ error: "Chưa có GEMINI_API_KEY. Thầy Sỹ Năm AI cần server Gemini." });
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
    if (!ai) return res.status(400).json({ error: "Chưa có GEMINI_API_KEY. AI tình duyên cần server Gemini." });
    const body = req.body || {};
    const { persons, focus, localReport, geminiModel, name1, birth1, name2, birth2 } = body;
    const finalPersons = persons || [{name:name1||"Người 1", birthDate:birth1||""},{name:name2||"Người 2", birthDate:birth2||""}];
    const fixedProfiles = finalPersons.map((p, i) => fixedLunarProfile(p, i + 1));
    const fixedSummary = fixedProfiles.map(p => `- ${p.name}: ${p.birthDate || 'chưa nhập'} => ${p.year || 'thiếu năm'}${p.canChi ? `, tuổi ${p.canChi}, nạp âm ${p.napAm}, ngũ hành ${p.nguHanh}` : ''}`).join("\n");
    const parts = [{ text: `
Bạn là chuyên gia luận TÌNH DUYÊN/HỢP TUỔI bằng tiếng Việt trong app Sỹ Năm Mystic Ultimate Pro. Hãy viết chi tiết, rõ ràng, có cấu trúc đẹp.

THỜI GIAN HIỆN TẠI TẠI VIỆT NAM: ${currentVietnamTime()}

DỮ LIỆU NỀN ĐÃ ĐƯỢC CODE TÍNH CỐ ĐỊNH - TUYỆT ĐỐI KHÔNG TỰ TÍNH LẠI:
${fixedSummary}

JSON DỮ LIỆU NỀN:
${JSON.stringify(fixedProfiles, null, 2)}

QUY TẮC BẮT BUỘC:
- Không được tự đổi Can Chi/Nạp âm/Ngũ hành. Ví dụ 2004 là Giáp Thân, không được nói Giáp Thìn.
- Nếu người dùng nhập thiếu/ngày sinh sai định dạng, nói rõ thiếu dữ liệu thay vì bịa.
- AI chỉ được luận giải dựa trên DỮ LIỆU NỀN ĐÃ ĐƯỢC CODE TÍNH CỐ ĐỊNH ở trên.
- Có mục điểm mạnh, điểm dễ xung đột, cách hóa giải/hòa hợp, lời khuyên thực tế.
- Không phán chắc cưới/ly hôn/chia tay/giàu nghèo/số phận. Chỉ nói theo hướng tham khảo văn hóa và tự nhận thức.
- Nếu dữ liệu thiếu giờ sinh thì nói rõ phần giờ sinh chỉ tham khảo/không có.
- Trả về Markdown đẹp.

DỮ LIỆU GỐC NGƯỜI DÙNG NHẬP:
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
5. Tính cách yêu, cách giao tiếp, điểm hút nhau
6. Điểm dễ xung đột
7. Cách hòa hợp và phát triển lâu dài
8. Lưu ý tham khảo
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
