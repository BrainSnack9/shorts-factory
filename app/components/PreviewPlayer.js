"use client";
import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { VolumeUp, PlayArrow, Pause } from "@mui/icons-material";
import { wrapText } from "../lib/finalize";

export default function PreviewPlayer({ story }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(true);
  const [playMode, setPlayMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const scenes = useMemo(
    () => (Array.isArray(story?.scenes) ? story.scenes : []),
    [story]
  );

  const current = scenes[sceneIndex] || {};

  // 텍스트 줄바꿈 처리
  const displayText = wrapText(current.onScreenText || current.voiceover || "");

  // HTML 태그와 이모티콘을 처리하는 함수
  const renderText = (text) => {
    if (!text) return "";

    // <br> 태그를 실제 줄바꿈으로 변환
    const processedText = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<br>/gi, "\n");

    return processedText;
  };

  // B-roll 영상이 있는지 확인
  const hasBroll =
    current.broll && (current.broll.url || current.broll.video_url);

  // 오디오 재생 함수
  const playAudio = (scene) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (scene.audioUrl) {
      const audio = new Audio(scene.audioUrl);
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      });
      audio.addEventListener("error", () => {
        console.error("오디오 재생 실패:", scene.audioUrl);
        setIsPlaying(false);
        setCurrentAudio(null);
      });

      audio
        .play()
        .then(() => {
          setCurrentAudio(audio);
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("오디오 재생 실패:", error);
          setIsPlaying(false);
        });
    }
  };

  // 씬 클릭 핸들러
  const handleSceneClick = (index) => {
    setSceneIndex(index);

    if (playMode && scenes[index].audioUrl) {
      playAudio(scenes[index]);
    }
  };

  // 재생 모드 토글
  const togglePlayMode = () => {
    setPlayMode(!playMode);
    if (isPlaying && currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* 옵션들 */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "center", gap: 3 }}>
        {/* 영상 보기 옵션 */}
        {hasBroll && (
          <FormControlLabel
            control={
              <Switch
                checked={showVideo}
                onChange={(e) => setShowVideo(e.target.checked)}
                color="primary"
              />
            }
            label="영상 보기"
            sx={{
              "& .MuiFormControlLabel-label": {
                fontSize: "14px",
                color: "text.secondary",
              },
            }}
          />
        )}

        {/* 재생 모드 버튼 */}
        <Button
          variant={playMode ? "contained" : "outlined"}
          color={playMode ? "success" : "primary"}
          startIcon={playMode ? <Pause /> : <PlayArrow />}
          onClick={togglePlayMode}
          size="small"
          sx={{ fontSize: "14px" }}
        >
          {playMode ? "재생 모드 종료" : "재생 모드 시작"}
        </Button>
      </Box>

      <Paper
        elevation={3}
        sx={{
          width: "100%",
          height: 600,
          borderRadius: 4,
          overflow: "hidden",
          background: "#000000", // 전체 배경은 검은색으로 고정
          color: current.textColor || "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 3,
          position: "relative",
          justifyContent: "flex-start",
        }}
      >
        {/* B-roll 영상 표시 */}
        {hasBroll && showVideo && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 1,
            }}
          >
            {current.broll.url ? (
              <video
                src={current.broll.url}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : current.broll.video_url ? (
              <video
                src={current.broll.video_url}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : null}
          </Box>
        )}

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
            zIndex: 2, // 영상 위에 텍스트 표시
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
              fontSize: `${(current.fontSize || 36) * 0.8}px`,
              maxWidth: "100%",
              wordBreak: "keep-all",
              fontFamily:
                "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
              // 텍스트 주변에만 배경색 적용 (FFmpeg의 box 옵션과 동일)
              backgroundColor: (() => {
                const bgColor = current.bgColor || "#000000";
                const bgAlpha = current.bgAlpha || 0.47;
                // 16진수 색상을 RGBA로 변환
                const hexToRgba = (hex, alpha) => {
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };
                return hexToRgba(bgColor, bgAlpha);
              })(),
              padding: "12px 24px", // FFmpeg의 boxborderw=24와 유사한 패딩
              borderRadius: "4px",
              // 텍스트가 없을 때는 배경색도 표시하지 않음
              ...(displayText.trim() === "" && {
                backgroundColor: "transparent",
                padding: 0,
              }),
            }}
          >
            {renderText(displayText)}
          </Typography>
        </Box>
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
              onClick={() => handleSceneClick(index)}
              size="small"
              sx={{
                minWidth: "auto",
                px: 1.5,
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              씬 #{index + 1}
              {scene.audioUrl && (
                <VolumeUp
                  fontSize="small"
                  sx={{
                    color: sceneIndex === index ? "inherit" : "primary.main",
                    opacity: 0.8,
                  }}
                />
              )}
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
            {current.bgAlpha && (
              <Chip
                label={`투명도 ${Math.round((current.bgAlpha || 0.47) * 100)}%`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
            {current.audioUrl && (
              <Chip
                label={isPlaying ? "재생 중" : "오디오 있음"}
                size="small"
                color={isPlaying ? "success" : "default"}
                variant="outlined"
                sx={{ ml: 1 }}
                icon={
                  isPlaying ? (
                    <Pause fontSize="small" />
                  ) : (
                    <VolumeUp fontSize="small" />
                  )
                }
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
