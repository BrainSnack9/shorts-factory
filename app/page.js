"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Tab,
  Tabs as MuiTabs,
  Chip,
  Grid2,
  ThemeProvider,
  createTheme,
  Button,
  IconButton,
} from "@mui/material";
import {
  SmartToy,
  VideoFile,
  AudioFile,
  Settings,
  Download,
  Visibility,
  List,
  ChevronRight,
  ChevronLeft,
} from "@mui/icons-material";
import PromptGenerator from "./components/PromptGenerator";
import StoryInfo from "./components/StoryInfo";
import BrollManager from "./components/BrollManager";
import AudioManager from "./components/AudioManager";
import VideoComposer from "./components/VideoComposer";
import PreviewPlayer from "./components/PreviewPlayer";
import { calculateDurationFromText } from "./lib/finalize";

const FIXED_KEY = "shortsfactory.fixedPrompt";

// Vercel 스타일 다크 테마 생성
const theme = createTheme({
  typography: {
    fontFamily:
      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
  },
  palette: {
    mode: "dark",
    primary: {
      main: "#0070F3", // Vercel 블루
      light: "#3291FF",
      dark: "#0051CC",
    },
    secondary: {
      main: "#FF6B6B", // 밝은 빨간색
      light: "#FF8E8E",
      dark: "#E55555",
    },
    background: {
      default: "#111111", // 진한 검은색
      paper: "#1a1a1a", // 약간 밝은 검은색
    },
    text: {
      primary: "#ffffff", // 흰색 텍스트
      secondary: "#a0a0a0", // 회색 텍스트
    },
    divider: "#333333", // 구분선 색상
    success: {
      main: "#00D4AA", // 밝은 청록색
    },
    warning: {
      main: "#F5A623", // 주황색
    },
    info: {
      main: "#0070F3", // Vercel 블루
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#1a1a1a",
          border: "1px solid #333333",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: "#0070F3",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#0051CC",
          },
        },
        outlined: {
          borderColor: "#333333",
          color: "#ffffff",
          "&:hover": {
            borderColor: "#0070F3",
            backgroundColor: "rgba(0, 112, 243, 0.1)",
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: "#a0a0a0",
          "&.Mui-selected": {
            color: "#0070F3",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: "#333333",
          color: "#ffffff",
        },
      },
    },
  },
});

export default function Home() {
  const [fixedPrompt, setFixedPrompt] = useState("");
  const [variablePrompt, setVariablePrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [previewTab, setPreviewTab] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // load/save fixed prompt
  useEffect(() => {
    const saved = localStorage.getItem(FIXED_KEY);
    if (saved) setFixedPrompt(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem(FIXED_KEY, fixedPrompt || "");
  }, [fixedPrompt]);

  const onGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixedPrompt, variablePrompt }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // 스키마 정규화: text → onScreenText, voiceover 보강, duration 자동 설정
      const fixed = {
        ...json,
        scenes: (json.scenes || []).map((s, i) => {
          const rawText = String(s.onScreenText ?? s.text ?? "").trim();
          const vo = String(s.voiceover ?? "").trim();
          const finalVoiceover = vo || rawText || `Scene ${i + 1}`;

          // 나레이션 텍스트 길이에 맞춰 duration 자동 계산
          const autoDuration = calculateDurationFromText(finalVoiceover);

          return {
            ...s,
            onScreenText: rawText,
            voiceover: finalVoiceover,
            durationSec: autoDuration, // 자동 계산된 duration 설정
          };
        }),
      };
      setResult(fixed);
    } catch (e) {
      alert(e.message || "generate failed");
    } finally {
      setLoading(false);
    }
  };

  // B-roll 선택 핸들러
  const handleBrollPick = (sceneId, clip) => {
    const next = {
      ...result,
      scenes: result.scenes.map((s) =>
        s.id === sceneId ? { ...s, broll: clip || null } : s
      ),
    };
    setResult(next);
  };

  // 스토리 변경 시 씬 데이터 정리 (씬 삭제/추가 후)
  const handleStoryChange = (newStory) => {
    console.log("[Page] 스토리 변경 감지:", {
      beforeScenes: result?.scenes?.length || 0,
      afterScenes: newStory?.scenes?.length || 0,
      newIds: newStory?.scenes?.map((s) => s.id) || [],
    });
    setResult(newStory);
  };

  // 탭 컨텐츠 렌더링 함수
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <PromptGenerator
            fixedPrompt={fixedPrompt}
            setFixedPrompt={setFixedPrompt}
            variablePrompt={variablePrompt}
            setVariablePrompt={setVariablePrompt}
            onGenerate={onGenerate}
            loading={loading}
            result={result}
          />
        );
      case 1:
        return <StoryInfo result={result} onChange={handleStoryChange} />;
      case 2:
        return (
          <BrollManager
            result={result}
            onPick={handleBrollPick}
            onStoryChange={handleStoryChange}
          />
        );
      case 3:
        return (
          <AudioManager result={result} onStoryChange={handleStoryChange} />
        );
      case 4:
        return (
          <VideoComposer
            result={result}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        );
      default:
        return (
          <PromptGenerator
            fixedPrompt={fixedPrompt}
            setFixedPrompt={setFixedPrompt}
            variablePrompt={variablePrompt}
            setVariablePrompt={setVariablePrompt}
            onGenerate={onGenerate}
            loading={loading}
            result={result}
          />
        );
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          minHeight: "100vh",
          backgroundColor: "#111111",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100vh",
          }}
        >
          <Box
            xs={12}
            lg={8}
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: "100%",
              transition: "width 0.3s ease",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                borderRadius: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333333",
              }}
            >
              {/* 헤더 */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "20px",
                      fontWeight: 700,
                    }}
                  >
                    Shorts Factory
                  </Typography>

                  {/* 프리뷰 토글 버튼 */}
                  <IconButton
                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                    sx={{
                      color: "white",
                      width: "36px",
                      height: "36px",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    {isPreviewOpen ? (
                      <ChevronRight fontSize="small" />
                    ) : (
                      <ChevronLeft fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </Box>

              {/* 탭 네비게이션 */}
              <MuiTabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: "64px",
                  "& .MuiTab-root": {
                    minHeight: "64px",
                    height: "64px",
                    padding: "12px 16px",
                    fontSize: "15px !important",
                    fontWeight: "600 !important",
                  },
                  "& .MuiTab-root .MuiTab-iconWrapper": {
                    marginRight: "8px",
                  },
                  "& .MuiTab-root .MuiTab-label": {
                    fontSize: "15px !important",
                    fontWeight: "600 !important",
                  },
                }}
              >
                <Tab label="1. 프롬프트/생성" />
                <Tab label="2. 씬 편집" />
                <Tab label="3. B-roll 선택" />
                <Tab label="4. 오디오(TTS) 생성" />
                <Tab label="5. 합성/다운로드" />
              </MuiTabs>

              {/* 탭 컨텐츠 */}
              <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                {renderTabContent()}
              </Box>
            </Paper>
          </Box>
        </Box>
        {isPreviewOpen && (
          <Box
            sx={{
              width: "100%",
              maxWidth: 400,
              height: "100vh",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                borderRadius: 0,
                borderLeft: 1,
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333333",
              }}
            >
              {/* 우측 탭 네비게이션 */}
              <MuiTabs
                value={previewTab}
                onChange={(e, newValue) => setPreviewTab(newValue)}
                variant="fullWidth"
                sx={{
                  minHeight: "48px",
                  "& .MuiTab-root": {
                    minHeight: "48px",
                    height: "48px",
                    fontSize: "15px !important",
                    fontWeight: "600 !important",
                  },
                  "& .MuiTab-root .MuiTab-label": {
                    fontSize: "15px !important",
                    fontWeight: "600 !important",
                  },
                }}
              >
                <Tab
                  label="프리뷰"
                  icon={<Visibility />}
                  iconPosition="start"
                />
                <Tab label="스토리보드" icon={<List />} iconPosition="start" />
              </MuiTabs>

              {/* 탭 컨텐츠 */}
              <Box
                sx={{
                  p: 2,
                  flexGrow: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {previewTab === 0 ? (
                  // 프리뷰 탭
                  result ? (
                    <PreviewPlayer story={result} />
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{
                        width: "100%",
                        maxWidth: 360,
                        height: 600,
                        borderRadius: 4,
                        borderStyle: "dashed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 3,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                      >
                        스토리보드를 생성하면
                        <br />
                        여기서 미리볼 수 있어요.
                      </Typography>
                    </Paper>
                  )
                ) : // 스토리보드 탭
                result ? (
                  <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "#0a0a0a",
                        color: "#00ff00",
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(result, null, 2)}
                    </Paper>
                  </Box>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      width: "100%",
                      maxWidth: 360,
                      height: 600,
                      borderRadius: 4,
                      borderStyle: "dashed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 3,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                    >
                      스토리보드를 생성하면
                      <br />
                      여기서 JSON을 볼 수 있어요.
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
