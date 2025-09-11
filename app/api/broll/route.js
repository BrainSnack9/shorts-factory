export const runtime = "nodejs";

async function searchPexelsVideos(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("Missing PEXELS_API_KEY");
  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "3"); // 상위 3개만
  url.searchParams.set("orientation", "portrait"); // 세로 비디오 우선

  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Pexels failed: ${res.status} ${msg}`);
  }
  const json = await res.json();
  // 가장 짧고 세로 비율에 가까운 파일 우선 선택
  return (json.videos || [])
    .map((v) => {
      const file =
        (v.video_files || [])
          .filter((f) => f.width < f.height) // 9:16에 가까운 것
          .sort((a, b) => a.height * b.width - b.height * a.width)[0] ||
        v.video_files?.[0];
      return {
        id: v.id,
        url: file?.link,
        width: file?.width,
        height: file?.height,
        duration: v.duration,
      };
    })
    .filter(Boolean);
}

export async function POST(req) {
  try {
    const { items = [] } = await req.json();
    // items: [{id:"s1", query:"하품하는 직장인"}]
    const out = [];
    for (const it of items) {
      const q = (it.query || "").trim();
      if (!q) {
        out.push({ id: it.id, results: [] });
        continue;
      }
      const results = await searchPexelsVideos(q);
      out.push({ id: it.id, results });
    }
    return Response.json(out);
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e?.message || "broll failed" },
      { status: 500 }
    );
  }
}
