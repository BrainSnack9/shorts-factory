export async function synthAllScenes(story, provider = "elevenlabs") {
  if (!story || !Array.isArray(story.scenes)) return [];
  const jobs = story.scenes.map((s, idx) => ({
    id: s.id || `s${idx + 1}`,
    // voiceover → onScreenText → text 순으로 확보
    text: String(s.voiceover ?? s.onScreenText ?? s.text ?? "").trim(),
  }));
  console.log("[TTS → /api/tts items]", jobs);

  const res = await fetch(`/api/tts?supplier=${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voice: story.ttsVoice || "female_warm",
      items: jobs,
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json; // [{id,mime,base64,error?}]
}

export function base64ToBlob(b64, mime = "audio/mpeg") {
  if (!b64) return new Blob([], { type: mime });
  const binary =
    typeof atob === "function"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
