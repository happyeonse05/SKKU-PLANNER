// 담다 Gemini 이미지 API
// 쓰는 곳: 시간표 사진 인식, 낱장(교재 스캔) Gemini 재인식
// GEMINI_API_KEY는 Vercel 환경변수에서만 읽습니다. 프론트엔드 코드에 키를 넣지 마세요.

const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];
const DEFAULT_ALLOWED_ORIGINS = ["https://happyeonse05.github.io"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BASE64_CHARS = 4_300_000; // Vercel 요청 본문 한도(약 4.5MB) 안쪽
const GEMINI_TIMEOUT_MS = 55000;

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let originHost = "";
  try { originHost = new URL(origin).host; } catch (e) {}
  const hosts = [req.headers["x-forwarded-host"], req.headers.host]
    .filter(Boolean)
    .flatMap((h) => String(h).split(",").map((x) => x.trim()));
  const extra = String(process.env.ALLOWED_ORIGINS || "")
    .split(",").map((x) => x.trim().replace(/\/+$/, "")).filter(Boolean);
  const allowed = hosts.includes(originHost) || [...DEFAULT_ALLOWED_ORIGINS, ...extra].includes(origin);
  if (!allowed) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  return true;
}

function friendlyError(status, message) {
  const msg = String(message || "");
  if (status === 429 || /quota|rate limit|resource.?exhausted/i.test(msg)) return "Gemini 사용 한도에 닿았어요. 잠시 뒤 다시 시도해 주세요.";
  if (status === 403 || /api key not valid|permission|unauthenticated/i.test(msg)) return "Vercel에 등록한 GEMINI_API_KEY를 확인해 주세요.";
  return msg || "이미지를 읽지 못했어요.";
}

async function callGemini(apiKey, parts, { maxOutputTokens }) {
  const preferred = String(process.env.GEMINI_MODEL || "").trim();
  const models = [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean))];
  let lastMessage = "";
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens } }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const candidate = data?.candidates?.[0] || {};
        const text = (candidate.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("\n").trim();
        return { ok: true, text, model, finishReason: candidate.finishReason || "", blockReason: data?.promptFeedback?.blockReason || "" };
      }
      const message = data?.error?.message || "";
      if (response.status === 404 || /not found|is not supported|deprecated|shut ?down|no longer available/i.test(message)) {
        lastMessage = message;
        continue;
      }
      return { ok: false, status: response.status, message: friendlyError(response.status, message) };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, status: 504, message: "Gemini 응답이 너무 오래 걸렸어요. 다시 시도해 주세요." };
      return { ok: false, status: 502, message: "Gemini 서버에 연결하지 못했어요." };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: 502, message: `사용할 수 있는 Gemini 모델을 찾지 못했어요. Vercel의 GEMINI_MODEL 값을 확인해 주세요. ${lastMessage}`.trim() };
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) {
    res.status(403).json({ error: "허용되지 않은 주소에서 온 요청이에요." });
    return;
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았어요. Vercel > Settings > Environment Variables에 등록해 주세요." });
    return;
  }
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  let imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  if (imageBase64.startsWith("data:")) imageBase64 = imageBase64.slice(imageBase64.indexOf(",") + 1);
  if (!imageBase64) {
    res.status(400).json({ error: "이미지가 없어요." });
    return;
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    res.status(413).json({ error: "사진이 너무 커요. 화면 캡처나 더 작은 사진으로 올려 주세요." });
    return;
  }
  const mimeType = ALLOWED_TYPES.includes(body.mediaType) ? body.mediaType : "image/jpeg";
  const prompt = typeof body.prompt === "string" && body.prompt.trim() ? body.prompt.slice(0, 30000) : "이 이미지의 내용을 정확히 읽어줘.";
  const maxOutputTokens = Math.min(16384, Math.max(256, Number(body.maxOutputTokens) || 8192));

  const result = await callGemini(apiKey, [
    { text: prompt },
    { inlineData: { mimeType, data: imageBase64 } },
  ], { maxOutputTokens });
  if (!result.ok) {
    res.status(result.status || 500).json({ error: result.message });
    return;
  }
  if (!result.text) {
    const blocked = result.blockReason || /SAFETY|PROHIBITED|BLOCKLIST|RECITATION/i.test(result.finishReason);
    res.status(502).json({ error: blocked ? "Gemini가 이 이미지는 처리하지 않았어요." : "Gemini가 읽은 내용을 돌려주지 않았어요." });
    return;
  }
  res.status(200).json({ text: result.text, model: result.model, truncated: result.finishReason === "MAX_TOKENS" });
}
