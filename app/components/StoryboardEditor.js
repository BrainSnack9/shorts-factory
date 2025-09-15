"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Chip,
  Slider,
  FormControl,
  InputLabel,
  Grid2,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { CommonCard, CommonTextField, CommonTypography } from "./common";
import {
  Edit,
  Delete,
  Warning,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from "@mui/icons-material";
import { calculateDurationFromText } from "../lib/finalize";

export default function StoryboardEditor({ story, onChange }) {
  const [local, setLocal] = useState(story);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState(null);

  // 스토리 변경 시 로컬 상태 업데이트
  useEffect(() => {
    if (story) {
      setLocal(story);
    }
  }, [story]);

  const updateScene = (idx, patch) => {
    const next = {
      ...local,
      scenes: local.scenes.map((s, i) => {
        if (i === idx) {
          const updatedScene = { ...s, ...patch };

          // 나레이션 텍스트가 변경되면 duration 자동 계산
          if (patch.voiceover && patch.voiceover !== s.voiceover) {
            const calculatedDuration = calculateDurationFromText(
              patch.voiceover
            );
            updatedScene.durationSec = calculatedDuration;
            console.log(
              `[StoryboardEditor] 씬 ${idx + 1} 나레이션 길이 기반 슬라이더 자동 설정:`,
              {
                텍스트길이: patch.voiceover.length,
                자동계산duration: calculatedDuration,
                이전duration: s.durationSec,
              }
            );
          }

          return updatedScene;
        }
        return s;
      }),
    };
    setLocal(next);
    onChange?.(next);
  };

  const deleteScene = (idx) => {
    if (local.scenes.length <= 1) {
      alert("최소 1개의 씬은 필요합니다.");
      return;
    }

    setSceneToDelete(idx);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sceneToDelete !== null) {
      const filteredScenes = local.scenes.filter((_, i) => i !== sceneToDelete);

      const next = {
        ...local,
        scenes: filteredScenes,
      };

      console.log("[StoryboardEditor] 씬 삭제:", {
        before: local.scenes.length,
        after: filteredScenes.length,
      });

      setLocal(next);
      onChange?.(next);
    }
    setDeleteDialogOpen(false);
    setSceneToDelete(null);
  };

  // 씬 순서 변경 함수들
  const moveSceneUp = (index) => {
    if (index === 0) return; // 첫 번째 씬은 위로 이동 불가

    const newScenes = [...local.scenes];
    [newScenes[index - 1], newScenes[index]] = [
      newScenes[index],
      newScenes[index - 1],
    ];

    const next = {
      ...local,
      scenes: newScenes,
    };

    console.log("[StoryboardEditor] 씬 위로 이동:", {
      from: index,
      to: index - 1,
      sceneId: newScenes[index - 1].id,
    });

    setLocal(next);
    onChange?.(next);
  };

  const moveSceneDown = (index) => {
    if (index === local.scenes.length - 1) return; // 마지막 씬은 아래로 이동 불가

    const newScenes = [...local.scenes];
    [newScenes[index], newScenes[index + 1]] = [
      newScenes[index + 1],
      newScenes[index],
    ];

    const next = {
      ...local,
      scenes: newScenes,
    };

    console.log("[StoryboardEditor] 씬 아래로 이동:", {
      from: index,
      to: index + 1,
      sceneId: newScenes[index + 1].id,
    });

    setLocal(next);
    onChange?.(next);
  };

  if (!local || !Array.isArray(local.scenes)) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {local.scenes.map((s, i) => (
        <CommonCard
          key={s.id || i}
          sx={{
            "& .MuiCardContent-root": {
              display: "flex",
              flexDirection: "column",
              gap: 3,
              padding: 3,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Edit fontSize="small" />
              <CommonTypography variant="h5">씬 #{i + 1}</CommonTypography>
              <Chip
                label={`${(s.durationSec || 3).toFixed(1)}초`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {/* 씬 순서 변경 버튼들 */}
              <IconButton
                size="small"
                onClick={() => moveSceneUp(i)}
                disabled={i === 0}
                title="위로 이동"
                sx={{
                  color: i === 0 ? "text.disabled" : "text.secondary",
                  "&:hover": {
                    backgroundColor: i === 0 ? "transparent" : "action.hover",
                  },
                }}
              >
                <KeyboardArrowUp fontSize="small" />
              </IconButton>

              <IconButton
                size="small"
                onClick={() => moveSceneDown(i)}
                disabled={i === local.scenes.length - 1}
                title="아래로 이동"
                sx={{
                  color:
                    i === local.scenes.length - 1
                      ? "text.disabled"
                      : "text.secondary",
                  "&:hover": {
                    backgroundColor:
                      i === local.scenes.length - 1
                        ? "transparent"
                        : "action.hover",
                  },
                }}
              >
                <KeyboardArrowDown fontSize="small" />
              </IconButton>

              {/* 씬 삭제 버튼 */}
              <IconButton
                size="small"
                color="error"
                onClick={() => deleteScene(i)}
                disabled={local.scenes.length <= 1}
                title={
                  local.scenes.length <= 1
                    ? "최소 1개의 씬은 필요합니다"
                    : "씬 삭제"
                }
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <CommonTextField
            fullWidth
            label="자막/텍스트"
            multiline
            rows={2}
            value={s.onScreenText ?? s.text ?? ""}
            onChange={(e) => updateScene(i, { onScreenText: e.target.value })}
          />
          <CommonTextField
            fullWidth
            label="나레이션"
            multiline
            rows={2}
            value={s.voiceover || ""}
            onChange={(e) => updateScene(i, { voiceover: e.target.value })}
            helperText="나레이션 텍스트를 입력하면 길이가 자동으로 계산됩니다 (분당 220자 기준)"
          />
          <CommonTextField
            fullWidth
            label="B-roll 프롬프트 (영문 키워드)"
            value={s.brollPrompt || ""}
            onChange={(e) => updateScene(i, { brollPrompt: e.target.value })}
            placeholder='예) "yawning office worker closeup"'
          />

          {/* 기본 색상 설정 - 한 줄에 배치 */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 2,
              alignItems: "center",
            }}
          >
            <CommonTextField
              label="배경색"
              type="color"
              value={s.bgColor || "#0d0d0d"}
              onChange={(e) => updateScene(i, { bgColor: e.target.value })}
              sx={{ flex: 1 }}
            />
            <CommonTextField
              label="텍스트색"
              type="color"
              value={s.textColor || "#ffffff"}
              onChange={(e) => updateScene(i, { textColor: e.target.value })}
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel shrink>배경 투명도</InputLabel>
              <Box sx={{ px: 1, pt: 3 }}>
                <Slider
                  value={s.bgAlpha || 0.47}
                  onChange={(e, value) => updateScene(i, { bgAlpha: value })}
                  min={0}
                  max={1}
                  step={0.01}
                  marks={[
                    { value: 0, label: "투명" },
                    { value: 0.5, label: "50%" },
                    { value: 1, label: "불투명" },
                  ]}
                  valueLabelDisplay="on"
                  valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                />
              </Box>
            </FormControl>
          </Box>

          {/* 자막 옵션 섹션 */}
          <Box
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              pt: 2,
              mt: 2,
            }}
          >
            <CommonTypography
              variant="h6"
              sx={{ mb: 2, color: "text.secondary" }}
            >
              자막 옵션
            </CommonTypography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 2,
              }}
            >
              <FormControl fullWidth>
                <InputLabel shrink>글자 크기</InputLabel>
                <Box sx={{ px: 1, pt: 3 }}>
                  <Slider
                    value={s.fontSize || 36}
                    onChange={(e, value) => updateScene(i, { fontSize: value })}
                    min={20}
                    max={80}
                    step={2}
                    marks={[
                      { value: 20, label: "20" },
                      { value: 36, label: "36" },
                      { value: 48, label: "48" },
                      { value: 60, label: "60" },
                      { value: 80, label: "80" },
                    ]}
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}px`}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    자막 글자 크기 (기본: 36px)
                  </Typography>
                </Box>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel shrink>세로 위치</InputLabel>
                <Box sx={{ px: 1, pt: 3 }}>
                  <Slider
                    value={s.textPosition || 50}
                    onChange={(e, value) =>
                      updateScene(i, { textPosition: value })
                    }
                    min={10}
                    max={90}
                    step={5}
                    marks={[
                      { value: 10, label: "위" },
                      { value: 50, label: "중앙" },
                      { value: 90, label: "아래" },
                    ]}
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    자막 세로 위치 (기본: 50% - 중앙)
                  </Typography>
                </Box>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel shrink>길이(초)</InputLabel>
                <Box sx={{ px: 1, pt: 3 }}>
                  <Slider
                    value={s.durationSec || 3}
                    onChange={(e, value) =>
                      updateScene(i, { durationSec: value })
                    }
                    min={1}
                    max={30}
                    step={0.5}
                    marks
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}초`}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    나레이션 입력 시 자동 계산됨 (수동 조정 가능)
                  </Typography>
                </Box>
              </FormControl>
            </Box>
          </Box>
        </CommonCard>
      ))}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle
          id="delete-dialog-title"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Warning color="warning" />씬 삭제 확인
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            정말로 씬 #{(sceneToDelete || 0) + 1}을(를) 삭제하시겠습니까?
            <br />
            삭제된 씬은 복구할 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            취소
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            autoFocus
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
