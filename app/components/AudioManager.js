"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Alert,
  Typography,
  Grid2,
  Card,
  CardContent,
  Chip,
  IconButton,
  Divider,
} from "@mui/material";
import {
  AudioFile,
  PlayArrow,
  VolumeUp,
  VolumeOff,
  Refresh,
} from "@mui/icons-material";
import { synthAllScenes, base64ToBlob } from "../lib/tts";

export default function AudioManager({ result, onStoryChange }) {
  const [playingScene, setPlayingScene] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);

  // 개별 씬 재생 함수
  const playSceneAudio = (scene) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (scene.audioUrl) {
      const audio = new Audio(scene.audioUrl);
      audio.addEventListener("ended", () => {
        setPlayingScene(null);
        setCurrentAudio(null);
      });
      audio.addEventListener("error", () => {
        console.error("오디오 재생 실패:", scene.audioUrl);
        setPlayingScene(null);
        setCurrentAudio(null);
      });

      audio
        .play()
        .then(() => {
          setCurrentAudio(audio);
          setPlayingScene(scene.id);
        })
        .catch((error) => {
          console.error("오디오 재생 실패:", error);
          setPlayingScene(null);
        });
    }
  };

  // 재생 정지 함수
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setPlayingScene(null);
    }
  };

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

      // 각 씬에 오디오 URL 저장
      const updatedScenes = result.scenes.map((scene, index) => {
        const audio = audios.find((a) => a.id === scene.id);
        if (audio && audio.base64) {
          const blob = base64ToBlob(audio.base64, audio.mime || "audio/mpeg");
          const audioUrl = URL.createObjectURL(blob);
          return { ...scene, audioUrl };
        }
        return scene;
      });

      // 스토리 업데이트
      const updatedResult = { ...result, scenes: updatedScenes };
      onStoryChange?.(updatedResult);

      // 첫 씬 재생
      const first = audios[0];
      const blob = base64ToBlob(first.base64, first.mime || "audio/mpeg");
      const url = URL.createObjectURL(blob);
      new Audio(url).play();
      alert("모든 씬의 TTS가 생성되었습니다. 첫 씬 음성을 재생합니다.");
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

  // TTS 현황 통계
  const totalScenes = result.scenes?.length || 0;
  const generatedScenes =
    result.scenes?.filter((scene) => scene.audioUrl).length || 0;
  const hasAudio = generatedScenes > 0;

  return (
    <Box
      sx={{
        p: 3,
        mx: "auto",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* TTS 생성 버튼들 */}
        <Box sx={{ display: "flex", flexDirection: "row", gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AudioFile />}
            fullWidth
            onClick={handleGenerateAndPlay}
          >
            씬별 TTS 생성 & 첫 컷 재생
          </Button>

          <Button
            variant="outlined"
            startIcon={<PlayArrow />}
            onClick={handleTestTTS}
            sx={{
              minWidth: "max-content",
            }}
          >
            테스트 TTS (샘플 문장)
          </Button>
        </Box>

        {/* TTS 현황 통계 */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontSize: "20px" }}>
              TTS 생성 현황
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={`전체 씬: ${totalScenes}개`}
                  color="default"
                  variant="outlined"
                />
                <Chip
                  label={`생성 완료: ${generatedScenes}개`}
                  color={
                    generatedScenes === totalScenes ? "success" : "primary"
                  }
                  variant="outlined"
                />
                <Chip
                  label={`진행률: ${totalScenes > 0 ? Math.round((generatedScenes / totalScenes) * 100) : 0}%`}
                  color={
                    generatedScenes === totalScenes ? "success" : "warning"
                  }
                  variant="outlined"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 씬별 TTS 목록 */}
        {hasAudio && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontSize: "20px" }}>
                씬별 TTS 재생
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  maxHeight: "400px",
                  overflowY: "auto",
                  pr: 1,
                }}
              >
                {result.scenes?.map((scene, index) => (
                  <Box key={scene.id || index}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        backgroundColor:
                          playingScene === scene.id
                            ? "action.hover"
                            : "transparent",
                      }}
                    >
                      {/* 씬 헤더 */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}
                        >
                          씬 #{index + 1}
                        </Typography>
                        <Box>
                          {scene.audioUrl ? (
                            <IconButton
                              onClick={() =>
                                playingScene === scene.id
                                  ? stopAudio()
                                  : playSceneAudio(scene)
                              }
                              color={
                                playingScene === scene.id ? "error" : "primary"
                              }
                              size="small"
                            >
                              {playingScene === scene.id ? (
                                <VolumeOff />
                              ) : (
                                <VolumeUp />
                              )}
                            </IconButton>
                          ) : (
                            <IconButton disabled size="small">
                              <VolumeOff />
                            </IconButton>
                          )}
                        </Box>
                      </Box>

                      {/* 씬 텍스트 */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1,
                          lineHeight: 1.4,
                        }}
                      >
                        {scene.onScreenText || scene.voiceover || "텍스트 없음"}
                      </Typography>

                      {/* 씬 정보 */}
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Chip
                          label={scene.audioUrl ? "TTS 생성됨" : "TTS 없음"}
                          size="small"
                          color={scene.audioUrl ? "success" : "default"}
                          variant="outlined"
                        />
                        {scene.durationSec && (
                          <Chip
                            label={`${scene.durationSec.toFixed(1)}초`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
