"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  TextField,
  Typography,
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
} from "@mui/material";
import { Edit, Delete, Warning, Refresh } from "@mui/icons-material";
import { calculateDurationFromText } from "../lib/finalize";

export default function StoryboardEditor({ story, onChange }) {
  const [local, setLocal] = useState(story);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState(null);

  // 스토리 변경 시 로컬 상태 업데이트 및 ID 정리
  useEffect(() => {
    if (story) {
      const normalizedStory = normalizeSceneIds(story);
      setLocal(normalizedStory);
    }
  }, [story]);

  // 씬 ID 정규화 함수
  const normalizeSceneIds = (storyData) => {
    if (!storyData?.scenes) return storyData;

    return {
      ...storyData,
      scenes: storyData.scenes.map((scene, index) => ({
        ...scene,
        id: `s${index + 1}`, // 순서대로 ID 재정렬
      })),
    };
  };

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

      // 씬 ID를 순서대로 재정렬 (s1, s2, s3...)
      const reorderedScenes = filteredScenes.map((scene, index) => ({
        ...scene,
        id: `s${index + 1}`, // ID 재정렬
        // B-roll과 오디오 참조도 새 ID로 업데이트될 수 있도록 초기화하지 않음
      }));

      const next = {
        ...local,
        scenes: reorderedScenes,
      };

      console.log("[StoryboardEditor] 씬 삭제 후 재정렬:", {
        before: local.scenes.length,
        after: reorderedScenes.length,
        newIds: reorderedScenes.map((s) => s.id),
      });

      setLocal(next);
      onChange?.(next);
    }
    setDeleteDialogOpen(false);
    setSceneToDelete(null);
  };

  // 수동으로 씬 ID 재정렬 및 데이터 정리
  const handleRefreshScenes = () => {
    const normalized = normalizeSceneIds(local);
    console.log("[StoryboardEditor] 수동 정렬 실행:", {
      before: local.scenes.map((s) => s.id),
      after: normalized.scenes.map((s) => s.id),
    });
    setLocal(normalized);
    onChange?.(normalized);
  };

  if (!local || !Array.isArray(local.scenes)) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 씬 정렬 버튼 */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          onClick={handleRefreshScenes}
          sx={{ fontSize: "0.8rem" }}
        >
          씬 ID 재정렬
        </Button>
      </Box>

      {local.scenes.map((s, i) => (
        <Card key={s.id || i} variant="outlined">
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
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
                <Typography variant="h6">씬 #{i + 1}</Typography>
                <Chip
                  label={`${s.durationSec || 3}초`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
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

            <TextField
              fullWidth
              label="자막/텍스트"
              multiline
              rows={2}
              value={s.onScreenText ?? s.text ?? ""}
              onChange={(e) => updateScene(i, { onScreenText: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="나레이션"
              multiline
              rows={2}
              value={s.voiceover || ""}
              onChange={(e) => updateScene(i, { voiceover: e.target.value })}
              variant="outlined"
              helperText="나레이션 텍스트를 입력하면 길이가 자동으로 계산됩니다 (분당 220자 기준)"
            />
            <TextField
              fullWidth
              label="B-roll 프롬프트 (영문 키워드)"
              value={s.brollPrompt || ""}
              onChange={(e) => updateScene(i, { brollPrompt: e.target.value })}
              placeholder='예) "yawning office worker closeup"'
              variant="outlined"
            />

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="배경색"
                type="color"
                value={s.bgColor || "#0d0d0d"}
                onChange={(e) => updateScene(i, { bgColor: e.target.value })}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="텍스트색"
                type="color"
                value={s.textColor || "#ffffff"}
                onChange={(e) => updateScene(i, { textColor: e.target.value })}
                variant="outlined"
              />

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
          </CardContent>
        </Card>
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
