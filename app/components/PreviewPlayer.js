"use client";
import { useMemo, useState } from "react";
import { Box, Typography, Button, Paper, Chip } from "@mui/material";
import { wrapText } from "../lib/finalize";

export default function PreviewPlayer({ story }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const scenes = useMemo(
    () => (Array.isArray(story?.scenes) ? story.scenes : []),
    [story]
  );

  const current = scenes[sceneIndex] || {};

  // 텍스트 줄바꿈 처리
  const displayText = wrapText(current.onScreenText || current.voiceover || "");

  return (
    <Box sx={{ width: "100%", maxWidth: 400 }}>
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 360,
          height: 600,
          borderRadius: 4,
          overflow: "hidden",
          background: current.bgColor || "#0d0d0d",
          color: current.textColor || "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 3,
          position: "relative",
          justifyContent: "flex-start", // 기본값을 flex-start로 변경
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: `${current.textPosition || 50}%`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
              textAlign: "center",
              whiteSpace: "pre-wrap",
              color: current.textColor || "#ffffff",
              fontSize: `${(current.fontSize || 36) * 0.8}px`, // 프리뷰에서는 80% 크기로 표시
              maxWidth: "100%", // 부모 컨테이너의 90% 너비 사용
              wordBreak: "keep-all", // 한국어 단어 단위로 줄바꿈
            }}
          >
            {displayText}
          </Typography>
        </Box>

        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 16,
            opacity: 0.8,
            color: current.textColor || "#ffffff",
          }}
        >
          쇼츠공장
        </Typography>
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Typography
          variant="body2"
          textAlign="center"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          씬 {sceneIndex + 1} / {scenes.length || 0}
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {scenes.map((scene, index) => (
            <Button
              key={index}
              variant={sceneIndex === index ? "contained" : "outlined"}
              onClick={() => setSceneIndex(index)}
              size="small"
              sx={{
                minWidth: "auto",
                px: 1.5,
                fontSize: "0.75rem",
              }}
            >
              씬 #{index + 1}
            </Button>
          ))}
        </Box>

        {current && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Chip
              label={`${(current.durationSec || 3).toFixed(1)}초`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {current.fontSize && (
              <Chip
                label={`${current.fontSize}px`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
            {current.textPosition && (
              <Chip
                label={`위치 ${current.textPosition}%`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
