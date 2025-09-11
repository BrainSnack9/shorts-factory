import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { fixedPrompt = "", variablePrompt = "" } = await req.json();
    if (!variablePrompt) {
      return Response.json(
        { error: "variablePrompt required" },
        { status: 400 }
      );
    }

    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = buildPromptV2(fixedPrompt, variablePrompt);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonText = text
      .replace(/^```json/i, "")
      .replace(/```$/, "")
      .trim();
    const data = JSON.parse(jsonText);

    if (!Array.isArray(data.scenes) || !data.title) {
      throw new Error("invalid storyboard");
    }

    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e?.message || "generation failed" },
      { status: 500 }
    );
  }
}

function buildPromptV2(fixed, variable) {
  return `
역할: 당신은 한국어 유튜브 쇼츠 '쇼츠공장'의 시나리오/감독입니다.
아래 JSON 스키마를 **정확히** 만족하는 스토리보드를 한국어로 생성하세요.

요구사항(강화):
- 총 길이 20~30초, 씬 3~6개, 씬당 2~6초.
- 고정 프롬프트(스타일/프레임/색/톤)는 반드시 반영.
- 씬마다 다음 필수 필드 포함 (**필드명 정확히 사용**, 'text' 키 금지):
  id, voiceover(나레이션: 최소 6자, 80자 이내, 빈칸 금지),
  onScreenText(화면 자막), durationSec,
  brollPrompt(배경 영상/이미지 생성용 프롬프트 — **간결한 영어 키워드**),
  bgColor(기본 배경색), textColor(자막색)
- 전체 메타:
  title(18자 이내), description(1~2문장), hashtags(5~8개),
  musicMood( "uplift" | "calm" | "dramatic" | "tech" ),
  ttsVoice(예: "female_warm", "male_neutral")

반드시 아래 형태의 JSON만 출력하세요(코드블록 금지):
{
  "title": "",
  "description": "",
  "hashtags": [""],
  "musicMood": "uplift",
  "ttsVoice": "female_warm",
  "scenes": [
    {
      "id": "s1",
      "voiceover": "",
      "onScreenText": "",
      "durationSec": 4,
      "brollPrompt": "yawning office worker closeup",
      "bgColor": "#0d0d0d",
      "textColor": "#ffffff"
    }
  ]
}

[고정 프롬프트]
${fixed}

[가변 프롬프트]
${variable}
`.trim();
}
