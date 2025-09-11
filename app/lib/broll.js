export async function fetchBrollForScenes(story) {
  const items = (story.scenes || []).map((s, i) => ({
    id: s.id || `s${i + 1}`,
    query: s.brollPrompt || s.onScreenText || s.voiceover || "",
  }));
  const res = await fetch("/api/broll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json; // [{id, results:[{id,url,width,height,duration}]}]
}
