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
} from "@mui/material";
import {
  SmartToy,
  VideoFile,
  AudioFile,
  Settings,
  Download,
} from "@mui/icons-material";
import PromptGenerator from "./components/PromptGenerator";
import StoryInfo from "./components/StoryInfo";
import BrollManager from "./components/BrollManager";
import AudioManager from "./components/AudioManager";
import VideoComposer from "./components/VideoComposer";
import PreviewPlayer from "./components/PreviewPlayer";
import { calculateDurationFromText } from "./lib/finalize";

const FIXED_KEY = "shortsfactory.fixedPrompt";

export default function Home() {
  const [fixedPrompt, setFixedPrompt] = useState("");
  const [variablePrompt, setVariablePrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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
        return <BrollManager result={result} onPick={handleBrollPick} />;
      case 3:
        return <AudioManager result={result} />;
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
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
          sx={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
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
                <Typography variant="h5" component="h1" fontWeight={800}>
                  🎬 쇼츠공장 · 자동 생성기
                </Typography>
              </Box>
            </Box>

            {/* 탭 네비게이션 */}
            <MuiTabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                height: "80px",
              }}
            >
              <Tab
                label="① 프롬프트/생성"
                icon={<SmartToy />}
                iconPosition="start"
                sx={{
                  paddingBottom: "10px",
                }}
              />
              <Tab label="② 씬 편집" icon={<Settings />} iconPosition="start" />
              <Tab
                label="③ B-roll 선택"
                icon={<VideoFile />}
                iconPosition="start"
                sx={{
                  paddingBottom: "10px",
                }}
              />
              <Tab
                label="④ 오디오(TTS)"
                icon={<AudioFile />}
                iconPosition="start"
                sx={{
                  paddingBottom: "10px",
                }}
              />
              <Tab
                label="⑤ 합성/다운로드"
                icon={<Download />}
                iconPosition="start"
                sx={{
                  paddingBottom: "10px",
                }}
              />
            </MuiTabs>

            {/* 탭 컨텐츠 */}
            <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
              {renderTabContent()}
            </Box>
          </Paper>
        </Box>
      </Box>
      <Box
        sx={{
          width: "30%",
          height: "100vh",
        }}
      >
        <Paper
          elevation={2}
          sx={{
            height: "100%",
            borderRadius: 0,
            borderLeft: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6">📱 프리뷰</Typography>
          </Box>
          <Box
            sx={{
              p: 2,
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {result ? (
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
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
