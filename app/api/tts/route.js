export const runtime = "nodejs";

// 한 항목 합성
async function ttsOne({ text, voiceId, apiKey }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const payload = {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.45, similarity_boost: 0.8 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      accept: "audio/mpeg",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.arrayBuffer();
  if (!res.ok) {
    // 실패 응답을 텍스트로 다시 읽기
    let textBody = "";
    try {
      const dec = new TextDecoder();
      textBody = dec.decode(raw).slice(0, 500); // 앞부분만
    } catch (_) {}
    throw new Error(`HTTP ${res.status} ${res.statusText} :: ${textBody}`);
  }

  // ok → base64
  const bytes = new Uint8Array(raw);
  const base64 = Buffer.from(bytes).toString("base64");
  return base64;
}

export async function POST(req) {
  try {
    const { voice = "female_warm", items = [] } = await req.json();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey) {
      return Response.json(
        { error: "Missing ELEVENLABS_API_KEY" },
        { status: 400 }
      );
    }
    if (!voiceId) {
      return Response.json(
        { error: "Missing ELEVENLABS_VOICE_ID" },
        { status: 400 }
      );
    }

    // 진단 로그(키 마스킹)
    console.log("[/api/tts] items:", items.length, "| voiceId:", voiceId);
    console.log("[/api/tts] apiKey:", apiKey?.slice(0, 10) + "...(masked)");

    const out = [];
    for (const it of items) {
      const text = String(it?.text || "").trim();
      if (!text) {
        out.push({
          id: it?.id || "unknown",
          mime: "audio/mpeg",
          base64: "",
          error: "empty_text",
        });
        continue;
      }
      try {
        const base64 = await ttsOne({ text, voiceId, apiKey });
        out.push({ id: it.id, mime: "audio/mpeg", base64 });
      } catch (err) {
        console.error("[/api/tts item failed]", it.id, err.message);
        out.push({
          id: it.id,
          mime: "audio/mpeg",
          base64: "",
          error: err.message,
        });
      }
    }

    return Response.json(out);
  } catch (e) {
    console.error("[/api/tts failed]", e);
    return Response.json(
      { error: e?.message || "tts failed" },
      { status: 500 }
    );
  }
}
