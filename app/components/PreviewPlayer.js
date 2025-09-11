"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, Button, LinearProgress, Paper } from "@mui/material";
import { PlayArrow, Pause, Replay } from "@mui/icons-material";

export default function PreviewPlayer({ story }) {
  const [playing, setPlaying] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const timerRef = useRef(null);
  const scenes = useMemo(
    () => (Array.isArray(story?.scenes) ? story.scenes : []),
    [story]
  );

  useEffect(() => {
    if (!playing || scenes.length === 0) return;
    const dur = (scenes[sceneIndex]?.durationSec || 3) * 1000;
    timerRef.current = setTimeout(() => {
      if (sceneIndex < scenes.length - 1) setSceneIndex((i) => i + 1);
      else setPlaying(false);
    }, dur);
    return () => clearTimeout(timerRef.current);
  }, [playing, sceneIndex, scenes]);

  const current = scenes[sceneIndex] || {};

  const progress =
    scenes.length > 0 ? ((sceneIndex + 1) / scenes.length) * 100 : 0;

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
          justifyContent: "center",
          alignItems: "center",
          p: 3,
          position: "relative",
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
          }}
        >
          {current.onScreenText || current.voiceover || ""}
        </Typography>

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
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mb: 2, borderRadius: 1 }}
        />

        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 1 }}>
          <Button
            variant="contained"
            startIcon={<Replay />}
            onClick={() => {
              setSceneIndex(0);
              setPlaying(true);
            }}
            size="small"
          >
            재생
          </Button>
          <Button
            variant="outlined"
            startIcon={playing ? <Pause /> : <PlayArrow />}
            onClick={() => setPlaying(!playing)}
            size="small"
          >
            {playing ? "일시정지" : "계속"}
          </Button>
        </Box>

        <Typography variant="body2" textAlign="center" color="text.secondary">
          씬 {sceneIndex + 1} / {scenes.length || 0}
        </Typography>
      </Box>
    </Box>
  );
}
