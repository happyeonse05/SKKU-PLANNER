export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았어요." });
    return;
  }
  try {
    const { imageBase64, mediaType, prompt } = req.body || {};
    if (!imageBase64) {
      res.status(400).json({ error: "이미지가 없어요." });
      return;
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
              },
              { type: "text", text: prompt || "이 이미지의 내용을 정리해줘." },
            ],
          },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || "이미지를 읽지 못했어요." });
      return;
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: "이미지를 읽지 못했어요." });
  }
}
