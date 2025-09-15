"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Alert,
  Typography,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import { synthAllScenes } from "../lib/tts";
import { buildFinalMP4 } from "../lib/finalize";
import { ffSelfTest } from "../lib/ff";

export default function VideoComposer({
  result,
  isProcessing,
  setIsProcessing,
}) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  if (!result) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          먼저 스토리보드/B-roll/TTS를 준비하세요.
        </Typography>
      </Box>
    );
  }

  const handleCompose = async () => {
    if (isProcessing) {
      alert("이미 합성이 진행 중입니다. 잠시 기다려주세요.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep("");

    try {
      // 1단계: FFmpeg 자가진단
      setCurrentStep("FFmpeg 초기화 중...");
      setProgress(10);
      await ffSelfTest();

      // 2단계: TTS 음성 합성
      setCurrentStep("TTS 음성 생성 중...");
      setProgress(30);
      const audios = await synthAllScenes(result, "elevenlabs");

      // 3단계: 최종 MP4 합성
      setCurrentStep("비디오 합성 중...");
      setProgress(60);
      const mp4 = await buildFinalMP4(result, audios);

      // 예상 길이와 실제 파일 크기 비교 로깅
      const expectedDuration =
        result.scenes?.reduce((sum, scene) => {
          return (
            sum + Math.max(1, Math.min(30, Number(scene.durationSec || 3)))
          );
        }, 0) || 0;

      console.log("[VideoComposer] 합성 완료:", {
        예상길이: expectedDuration + "초",
        파일크기: Math.round(mp4.size / 1024) + "KB",
        씬개수: result.scenes?.length || 0,
      });

      // 4단계: 파일 다운로드
      setCurrentStep("파일 준비 중...");
      setProgress(80);

      if (mp4.size === 0) {
        throw new Error("생성된 비디오 파일이 비어있습니다.");
      }

      const url = URL.createObjectURL(mp4);

      setCurrentStep("다운로드 시작...");
      setProgress(90);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shorts_${Date.now()}.mp4`;
      a.style.display = "none";

      document.body.appendChild(a);

      // 브라우저 호환성을 위해 지연 후 클릭
      setTimeout(() => {
        try {
          a.click();

          // 정리 작업을 약간 지연
          setTimeout(() => {
            a.remove();
            URL.revokeObjectURL(url);

            setCurrentStep("완료!");
            setProgress(100);

            // 사용자에게 성공 알림
            alert(
              "✅ 비디오 다운로드가 시작되었습니다!\n다운로드 폴더를 확인해주세요."
            );
          }, 1000);
        } catch (clickError) {
          console.error("[UI] 다운로드 클릭 실패:", clickError);

          // 대안: 새 창으로 열기 시도
          try {
            window.open(url, "_blank");
          } catch (altError) {
            console.error("[UI] 대안 다운로드도 실패:", altError);

            // 최후의 수단: 사용자에게 수동 다운로드 링크 제공
            const manualDownload = confirm(
              "자동 다운로드에 실패했습니다.\n" +
                "수동으로 다운로드 링크를 열까요?\n" +
                "(새 탭에서 비디오를 우클릭하여 '다른 이름으로 저장'을 선택하세요)"
            );

            if (manualDownload) {
              window.open(url, "_blank");
            } else {
              alert("다운로드가 취소되었습니다.");
            }
          }
        }
      }, 100);
    } catch (e) {
      console.error("[UI] 합성 실패:", e);
      alert(`합성 실패: ${e.message}`);
    } finally {
      // 성공/실패 관계없이 처리 상태 리셋
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setCurrentStep("");
      }, 2000); // 2초 후 다시 사용 가능
    }
  };

  return (
    <Box sx={{ p: 3, mx: "auto" }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        선택한 B-roll / 생성된 TTS / 자막을 합쳐 최종 mp4를 만듭니다.
      </Alert>

      <Button
        variant="contained"
        size="large"
        color="primary"
        startIcon={isProcessing ? <CircularProgress size={20} /> : <Download />}
        disabled={isProcessing}
        fullWidth
        onClick={handleCompose}
        sx={{ mb: 3 }}
      >
        {isProcessing ? "합성 진행 중..." : "mp4 합성 & 다운로드"}
      </Button>

      {/* 진행률 표시 */}
      {isProcessing && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontSize: "20px" }}>
              합성 진행 상황
            </Typography>

            {/* 현재 단계 */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {currentStep}
            </Typography>

            {/* 프로그래스바 */}
            <Box sx={{ mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                  },
                }}
              />
            </Box>

            {/* 퍼센트 표시 */}
            <Typography
              variant="body2"
              color="primary"
              sx={{ textAlign: "center" }}
            >
              {Math.round(progress)}%
            </Typography>
          </CardContent>
        </Card>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center" }}
      >
        ※ 브라우저에서 ffmpeg.wasm으로 렌더링합니다(시간이 걸릴 수 있음).
      </Typography>
    </Box>
  );
}
