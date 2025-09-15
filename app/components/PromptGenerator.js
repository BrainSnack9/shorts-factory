"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  CircularProgress,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Typography,
  Button,
} from "@mui/material";
import {
  CommonCard,
  CommonTextField,
  CommonButton,
  CommonTypography,
  CommonDialog,
} from "./common";
import {
  SmartToy,
  Restore,
  History,
  Clear,
  Refresh,
  Delete,
} from "@mui/icons-material";

const VARIABLE_HISTORY_KEY = "shortsfactory.variableHistory";

export default function PromptGenerator({
  fixedPrompt,
  setFixedPrompt,
  variablePrompt,
  setVariablePrompt,
  onGenerate,
  loading,
  result,
}) {
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);

  // 히스토리 로드
  useEffect(() => {
    const saved = localStorage.getItem(VARIABLE_HISTORY_KEY);
    if (saved) {
      try {
        setPromptHistory(JSON.parse(saved));
      } catch (e) {
        console.error("히스토리 로드 실패:", e);
      }
    }
  }, []);

  // 히스토리 저장
  const saveToHistory = (prompt) => {
    if (!prompt.trim()) return;

    const newHistory = [
      { id: Date.now(), prompt, timestamp: new Date().toLocaleString() },
      ...promptHistory.filter((item) => item.prompt !== prompt),
    ].slice(0, 20); // 최대 20개만 유지

    setPromptHistory(newHistory);
    localStorage.setItem(VARIABLE_HISTORY_KEY, JSON.stringify(newHistory));
  };

  // 히스토리 초기화
  const clearHistory = () => {
    setPromptHistory([]);
    localStorage.removeItem(VARIABLE_HISTORY_KEY);
  };

  // 히스토리에서 선택
  const selectFromHistory = (prompt) => {
    setVariablePrompt(prompt);
    setHistoryDialogOpen(false);
  };

  // 개별 히스토리 삭제
  const deleteHistoryItem = (id) => {
    const newHistory = promptHistory.filter((item) => item.id !== id);
    setPromptHistory(newHistory);
    localStorage.setItem(VARIABLE_HISTORY_KEY, JSON.stringify(newHistory));
  };

  // 수정된 onGenerate 함수
  const handleGenerate = () => {
    saveToHistory(variablePrompt);
    onGenerate();
  };
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
    <Box
      sx={{
        p: 3,
        height: "100%",
        backgroundColor: "#000000",
      }}
    >
      <CommonCard>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <CommonTypography>고정 프롬프트</CommonTypography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              자동 저장됨
            </Typography>
            <CommonButton startIcon={<Restore />} onClick={setDefaultPrompt}>
              기본값
            </CommonButton>
          </Box>
        </Box>
        <CommonTextField
          fullWidth
          multiline
          rows={8}
          value={fixedPrompt}
          onChange={(e) => setFixedPrompt(e.target.value)}
          placeholder="예) 프레임 9:16 / 총 24~28초 / 보라+검정 / 굵은 자막 / 강한 Hook"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 4,
            },
          }}
        />
      </CommonCard>

      <CommonCard>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <CommonTypography>어떤 주제로 쇼츠를 만들까요?</CommonTypography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <CommonButton
              startIcon={<History />}
              onClick={() => setHistoryDialogOpen(true)}
            >
              내역
            </CommonButton>
            <CommonButton
              startIcon={<Clear />}
              onClick={clearHistory}
              disabled={promptHistory.length === 0}
            >
              초기화
            </CommonButton>
          </Box>
        </Box>
        <CommonTextField
          fullWidth
          multiline
          rows={10}
          value={variablePrompt}
          onChange={(e) => setVariablePrompt(e.target.value)}
          placeholder="예) 카페인이 피로를 '없애는' 게 아니라 '속인다'로 시작, 씬 4개"
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: 4,
            },
          }}
        />
        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} /> : null}
          onClick={handleGenerate}
          disabled={loading || !variablePrompt}
          fullWidth
        >
          {loading ? "생성 중..." : "스토리보드 생성"}
        </Button>
      </CommonCard>

      {/* 히스토리 다이얼로그 */}
      <CommonDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <CommonTypography variant="h5">가변 프롬프트 내역</CommonTypography>
            <Chip
              label={`${promptHistory.length}개`}
              size="small"
              color="primary"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {promptHistory.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 4,
                color: "text.secondary",
              }}
            >
              <History sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body1">
                저장된 프롬프트가 없습니다
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                스토리보드를 생성하면 자동으로 저장됩니다
              </Typography>
            </Box>
          ) : (
            <List>
              {promptHistory.map((item, index) => (
                <ListItem
                  key={item.id}
                  sx={{
                    border: "1px solid #2a2a2a",
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: "#0a0a0a",
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {item.timestamp}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => deleteHistoryItem(item.id)}
                          sx={{ color: "error.main" }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          maxHeight: "100px",
                          overflow: "auto",
                        }}
                      >
                        {item.prompt}
                      </Typography>
                    }
                  />
                  <Box
                    sx={{
                      ml: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Refresh />}
                      onClick={() => selectFromHistory(item.prompt)}
                    >
                      사용
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <CommonButton onClick={() => setHistoryDialogOpen(false)}>
            닫기
          </CommonButton>
          {promptHistory.length > 0 && (
            <CommonButton
              onClick={clearHistory}
              color="error"
              startIcon={<Clear />}
            >
              전체 삭제
            </CommonButton>
          )}
        </DialogActions>
      </CommonDialog>
    </Box>
  );
}
