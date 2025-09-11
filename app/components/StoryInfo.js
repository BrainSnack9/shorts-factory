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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem", mb: 0.5 }}
              >
                제목
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                {result.title}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem", mb: 0.5 }}
              >
                설명
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                {result.description}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem", mb: 0.5 }}
              >
                해시태그
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {Array.isArray(result.hashtags) &&
                  result.hashtags.map((tag, i) => (
                    <Chip
                      key={i}
                      label={tag.startsWith("#") ? tag : `#${tag}`}
                      size="small"
                      sx={{ fontSize: "0.7rem", height: "20px" }}
                    />
                  ))}
              </Box>
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem", mb: 0.5 }}
              >
                TTS 톤
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                {result.ttsVoice}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem", mb: 0.5 }}
              >
                총 영상 길이
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  mb: 1,
                }}
              >
                <Chip
                  label={`${totalDuration.toFixed(1)}초 (${Math.floor(totalDuration / 60)}분 ${(totalDuration % 60).toFixed(1)}초)`}
                  color={totalDuration > 60 ? "warning" : "success"}
                  size="small"
                  sx={{ fontSize: "0.7rem", height: "20px" }}
                />
                {totalDuration > 60 && (
                  <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{ fontSize: "0.65rem" }}
                  >
                    ⚠️ 쇼츠 권장 길이 60초 초과
                  </Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.65rem" }}
              >
                (실제 합성 시 사용되는 길이)
              </Typography>
              <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {result.scenes?.map((scene, i) => {
                  const sceneDur = Math.max(
                    1,
                    Math.min(30, Number(scene.durationSec || 3))
                  );
                  const isClipped = sceneDur !== Number(scene.durationSec || 3);
                  return (
                    <Chip
                      key={i}
                      label={`씬${i + 1}: ${sceneDur.toFixed(1)}초${isClipped ? " (제한됨)" : ""}`}
                      size="small"
                      variant="outlined"
                      color={isClipped ? "warning" : "default"}
                      sx={{ fontSize: "0.65rem", height: "18px" }}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <StoryboardEditor story={result} onChange={onChange} />
    </Box>
  );
}
