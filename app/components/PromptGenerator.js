"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
} from "@mui/material";
import { SmartToy, Restore } from "@mui/icons-material";

export default function PromptGenerator({
  fixedPrompt,
  setFixedPrompt,
  variablePrompt,
  setVariablePrompt,
  onGenerate,
  loading,
  result,
}) {
  // 기본값 설정 함수
  const setDefaultPrompt = () => {
    const defaultPrompt = `- 영상 형식: 유튜브 쇼츠
- 화면 비율: 세로 9:16
- 씬 구성: 총 3개
  ① Hook (강렬한 질문/한 줄 요약)
  ② Main (핵심 비교·사실 설명)
  ③ Conclusion (정리 + 시청자에게 질문)
- 자막:
  • 한국어, 짧고 굵은 텍스트
  • 핵심 단어는 색상 강조
  • 말과 동시에 나타나도록 싱크
- B-roll:
  • 영어 키워드로 검색/생성
  • 단순하고 직관적인 장면 (복잡하지 않게)
- 배경:
  • 다크 톤 + 대비 강한 색감
- 음악/오디오:
  • 별도 보이스/음악 생성하지 않음 (외부 음성 파일 사용 예정)`;

    setFixedPrompt(defaultPrompt);
  };
  return (
    <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">고정 프롬프트</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Restore />}
              onClick={setDefaultPrompt}
              sx={{ fontSize: "0.8rem" }}
            >
              기본값
            </Button>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={fixedPrompt}
            onChange={(e) => setFixedPrompt(e.target.value)}
            placeholder="예) 프레임 9:16 / 총 24~28초 / 보라+검정 / 굵은 자막 / 강한 Hook"
            sx={{ mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            자동 저장됨 (localStorage)
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            가변 프롬프트 (이번 주제)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={variablePrompt}
            onChange={(e) => setVariablePrompt(e.target.value)}
            placeholder="예) 카페인이 피로를 '없애는' 게 아니라 '속인다'로 시작, 씬 4개"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SmartToy />}
            onClick={onGenerate}
            disabled={loading || !variablePrompt}
            fullWidth
          >
            {loading ? "생성 중..." : "스토리보드 생성"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              생성 결과
            </Typography>
            <Paper
              sx={{
                p: 2,
                bgcolor: "#0a0a0a",
                color: "#00ff00",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                maxHeight: 300,
                overflow: "auto",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </Paper>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
