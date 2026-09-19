const DEFAULT_ALLOWED_ORIGINS = ["https://happyeonse05.github.io"];

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

  const { userId, accessToken } = req.body || {};
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    res.status(503).json({ error: "회원탈퇴 서버 설정이 아직 완료되지 않았어요." });
    return;
  }
  if (!userId || !accessToken) {
    res.status(400).json({ error: "로그인 정보가 없어요." });
    return;
  }

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    });
    const user = await userResponse.json();
    if (!userResponse.ok || user.id !== userId) {
      res.status(401).json({ error: "로그인 세션을 확인하지 못했어요." });
      return;
    }

    const dataResponse = await fetch(`${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!dataResponse.ok) {
      res.status(500).json({ error: "플래너 데이터를 먼저 삭제하지 못했어요." });
      return;
    }

    const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!deleteResponse.ok) {
      const detail = await deleteResponse.text();
      res.status(deleteResponse.status).json({ error: detail || "계정을 삭제하지 못했어요." });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "회원탈퇴 처리 중 오류가 발생했어요." });
  }
}
