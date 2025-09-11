"use client";

import { Box, Button, Alert, Typography, Grid2 } from "@mui/material";
import { AudioFile, PlayArrow } from "@mui/icons-material";
import { synthAllScenes, base64ToBlob } from "../lib/tts";

export default function AudioManager({ result }) {
  if (!result) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          먼저 스토리보드를 생성하세요.
        </Typography>
      </Box>
    );
  }

  const handleGenerateAndPlay = async () => {
    try {
      const audios = await synthAllScenes(result, "elevenlabs");
      const empties = audios.filter((a) => !a.base64);
      if (empties.length) {
        console.warn("[TTS empty items]", empties);
        alert(
          "다음 씬의 TTS가 비었습니다:\n" +
            empties.map((e) => `- ${e.id}: ${e.error || "no_text"}`).join("\n")
        );
        return;
      }
      const first = audios[0];
      const blob = base64ToBlob(first.base64, first.mime || "audio/mpeg");
      const url = URL.createObjectURL(blob);
      new Audio(url).play();
      alert("첫 씬 음성을 재생합니다.");
    } catch (e) {
      alert(e.message || "TTS 실패");
    }
  };

  const handleTestTTS = async () => {
    const res = await fetch("/api/tts?supplier=elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voice: "female_warm",
        items: [{ id: "test", text: "안녕하세요. 쇼츠공장입니다." }],
      }),
    });
    const arr = await res.json();
    const ok = arr?.[0]?.base64;
    if (!ok) {
      alert("TTS 연결/권한 문제일 수 있습니다. 서버 로그를 확인하세요.");
      return;
    }
    const blob = base64ToBlob(ok, "audio/mpeg");
    new Audio(URL.createObjectURL(blob)).play();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AudioFile />}
            fullWidth
            onClick={handleGenerateAndPlay}
          >
            씬별 TTS 생성 & 첫 컷 재생
          </Button>
        </Grid2>
        <Grid2 xs={12}>
          <Button
            variant="outlined"
            startIcon={<PlayArrow />}
            onClick={handleTestTTS}
          >
            테스트 TTS (샘플 문장)
          </Button>
        </Grid2>
        <Grid2 xs={12}>
          <Alert severity="info">
            모든 씬 음성은 내부적으로 준비되며, 다음 단계에서 최종 합성에
            사용됩니다.
          </Alert>
        </Grid2>
      </Grid2>
    </Box>
  );
}
