// 담다 Gemini 텍스트 API
// 쓰는 곳: 오늘 우선순위 AI 계획, PDF 정리, 녹음 전사문 → 필기본, 출제 스타일 분석, 낱장 문법 검사
// GEMINI_API_KEY는 Vercel 환경변수에서만 읽습니다. 프론트엔드 코드에 키를 넣지 마세요.

const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];
const DEFAULT_ALLOWED_ORIGINS = ["https://happyeonse05.github.io"];
const MAX_PROMPT_CHARS = 400000;
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
  return msg || "Gemini 호출에 실패했어요.";
}

async function callGemini(apiKey, parts, { maxOutputTokens, json }) {
  const preferred = String(process.env.GEMINI_MODEL || "").trim();
  const models = [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean))];
  let lastMessage = "";
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const generationConfig = { maxOutputTokens };
      if (json) generationConfig.responseMimeType = "application/json";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const candidate = data?.candidates?.[0] || {};
        const text = (candidate.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("\n").trim();
        return { ok: true, text, model, finishReason: candidate.finishReason || "", blockReason: data?.promptFeedback?.blockReason || "" };
      }
      const message = data?.error?.message || "";
      // 모델 이름이 없거나 종료된 경우에만 다음 모델로 넘어갑니다.
      if (response.status === 404 || /not found|is not supported|deprecated|shut ?down|no longer available/i.test(message)) {
        lastMessage = message;
        continue;
      }
      return { ok: false, status: response.status, message: friendlyError(response.status, message) };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, status: 504, message: "Gemini 응답이 너무 오래 걸렸어요. 내용을 나눠서 다시 시도해 주세요." };
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
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) {
    res.status(400).json({ error: "prompt가 없어요." });
    return;
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    res.status(413).json({ error: "보내는 글이 너무 길어요. 범위를 나눠서 다시 시도해 주세요." });
    return;
  }
  const maxOutputTokens = Math.min(32768, Math.max(256, Number(body.maxOutputTokens) || 16384));

  const result = await callGemini(apiKey, [{ text: prompt }], { maxOutputTokens, json: body.json === true });
  if (!result.ok) {
    res.status(result.status || 500).json({ error: result.message });
    return;
  }
  if (!result.text) {
    const blocked = result.blockReason || /SAFETY|PROHIBITED|BLOCKLIST|RECITATION/i.test(result.finishReason);
    res.status(502).json({ error: blocked ? "Gemini가 이 내용은 처리하지 않았어요. 내용을 조금 바꿔 다시 시도해 주세요." : "Gemini 결과가 비어 있어요. 다시 시도해 주세요." });
    return;
  }
  res.status(200).json({ text: result.text, model: result.model, truncated: result.finishReason === "MAX_TOKENS" });
}
