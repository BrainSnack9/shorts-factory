"use client";

import { Box, Card, CardContent, Typography, Chip, Grid2 } from "@mui/material";
import StoryboardEditor from "./StoryboardEditor";

export default function StoryInfo({ result, onChange }) {
  if (!result) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          먼저 &apos;프롬프트/생성&apos;에서 스토리보드를 만들어주세요.
        </Typography>
      </Box>
    );
  }

  // 총 영상 길이 계산 (finalize.js와 동일한 로직 사용)
  const totalDuration =
    result.scenes?.reduce((sum, scene) => {
      // finalize.js와 동일한 계산 로직
      const sceneDur = Math.max(
        1,
        Math.min(30, Number(scene.durationSec || 3))
      );
      return sum + sceneDur;
    }, 0) || 0;

  return (
    <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid2 container spacing={2}>
            <Grid2 item xs={12} md={6}>
              <Typography variant="body1">
                <strong>제목:</strong> {result.title}
              </Typography>
            </Grid2>
            <Grid2 item xs={12} md={6}>
              <Typography variant="body1">
                <strong>설명:</strong> {result.description}
              </Typography>
            </Grid2>
            <Grid2 item xs={12}>
              <Box sx={{ mb: 1 }}>
                <strong>해시태그:</strong>
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {Array.isArray(result.hashtags) &&
                  result.hashtags.map((tag, i) => (
                    <Chip
                      key={i}
                      label={tag.startsWith("#") ? tag : `#${tag}`}
                      size="small"
                    />
                  ))}
              </Box>
            </Grid2>
            <Grid2 item xs={12}>
              <Typography variant="body1">
                <strong>TTS 톤:</strong> {result.ttsVoice}
              </Typography>
            </Grid2>
            <Grid2 item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body1">
                  <strong>총 영상 길이:</strong>
                </Typography>
                <Chip
                  label={`${totalDuration}초 (${Math.floor(totalDuration / 60)}분 ${totalDuration % 60}초)`}
                  color={totalDuration > 60 ? "warning" : "success"}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  (실제 합성 시 사용되는 길이)
                </Typography>
                {totalDuration > 60 && (
                  <Typography variant="caption" color="warning.main">
                    ⚠️ 쇼츠 권장 길이 60초 초과
                  </Typography>
                )}
              </Box>
              <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {result.scenes?.map((scene, i) => {
                  const sceneDur = Math.max(
                    1,
                    Math.min(30, Number(scene.durationSec || 3))
                  );
                  const isClipped = sceneDur !== Number(scene.durationSec || 3);
                  return (
                    <Chip
                      key={i}
                      label={`씬${i + 1}: ${sceneDur}초${isClipped ? " (제한됨)" : ""}`}
                      size="small"
                      variant="outlined"
                      color={isClipped ? "warning" : "default"}
                    />
                  );
                })}
              </Box>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>
      <StoryboardEditor story={result} onChange={onChange} />
    </Box>
  );
}
