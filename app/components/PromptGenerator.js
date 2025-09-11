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
import { SmartToy } from "@mui/icons-material";

export default function PromptGenerator({
  fixedPrompt,
  setFixedPrompt,
  variablePrompt,
  setVariablePrompt,
  onGenerate,
  loading,
  result,
}) {
  return (
    <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            고정 프롬프트
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
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
            rows={12}
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
