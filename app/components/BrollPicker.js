"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Grid2,
  TextField,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  Refresh,
  VideoLibrary,
  CheckCircle,
  RefreshOutlined,
  Edit,
  Save,
  Cancel,
} from "@mui/icons-material";

export default function BrollPicker({ story, onPick, onStoryChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshingScenes, setRefreshingScenes] = useState(new Set());
  const [editingPrompts, setEditingPrompts] = useState(new Set());
  const [tempPrompts, setTempPrompts] = useState({});
  // 쿼리 결과 캐시: key = query 문자열, val = [{id,url,width,height,duration}]
  const cacheRef = useRef(new Map());

  // 씬 → {id, query} 목록 (선택 상태(broll)는 제외해서 signature에 영향 X)
  const items = useMemo(() => {
    const scenes = Array.isArray(story?.scenes) ? story.scenes : [];
    return scenes.map((s, i) => ({
      id: s.id || `s${i + 1}`,
      query: (s.brollPrompt || s.onScreenText || s.voiceover || "")
        .replace(/[^\w가-힣\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5)
        .join(" "),
    }));
  }, [story?.scenes]); // broll(선택)은 의존성에 포함 안 되도록 scenes만 보되, 쿼리 생성 로직이 broll을 참조하지 않게 설계

  // 쿼리 서명: 선택만 바뀌면 동일하게 유지됨
  const signature = useMemo(
    () => items.map((it) => `${it.id}:${it.query}`).join("|"),
    [items]
  );

  // B-roll 프롬프트 수정 함수들
  const startEditPrompt = (sceneId) => {
    const scene = story.scenes?.find(
      (s) => (s.id || `s${story.scenes.indexOf(s) + 1}`) === sceneId
    );
    if (scene) {
      setEditingPrompts((prev) => new Set(prev).add(sceneId));
      setTempPrompts((prev) => ({
        ...prev,
        [sceneId]: scene.brollPrompt || "",
      }));
    }
  };

  const savePrompt = (sceneId) => {
    const newPrompt = tempPrompts[sceneId] || "";

    // 스토리 업데이트
    if (onStoryChange) {
      const updatedStory = {
        ...story,
        scenes: story.scenes.map((s, i) => {
          const currentId = s.id || `s${i + 1}`;
          if (currentId === sceneId) {
            return { ...s, brollPrompt: newPrompt };
          }
          return s;
        }),
      };
      onStoryChange(updatedStory);
    }

    // 편집 상태 해제
    setEditingPrompts((prev) => {
      const newSet = new Set(prev);
      newSet.delete(sceneId);
      return newSet;
    });
    setTempPrompts((prev) => {
      const newTemp = { ...prev };
      delete newTemp[sceneId];
      return newTemp;
    });

    // 프롬프트가 변경되었으면 해당 씬의 B-roll 새로고침
    if (
      newPrompt !==
      (story.scenes?.find(
        (s) => (s.id || `s${story.scenes.indexOf(s) + 1}`) === sceneId
      )?.brollPrompt || "")
    ) {
      setTimeout(() => refreshScene(sceneId), 100);
    }
  };

  const cancelEditPrompt = (sceneId) => {
    setEditingPrompts((prev) => {
      const newSet = new Set(prev);
      newSet.delete(sceneId);
      return newSet;
    });
    setTempPrompts((prev) => {
      const newTemp = { ...prev };
      delete newTemp[sceneId];
      return newTemp;
    });
  };

  // 개별 씬의 B-roll 새로고침 함수
  async function refreshScene(sceneId) {
    const scene = items.find((item) => item.id === sceneId);
    if (!scene) return;

    // 해당 씬만 로딩 상태로 설정
    setRefreshingScenes((prev) => new Set(prev).add(sceneId));

    try {
      // 해당 쿼리의 캐시를 삭제
      cacheRef.current.delete(scene.query);

      // 해당 쿼리만 다시 요청
      const res = await fetch("/api/broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: scene.query }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // 캐시에 저장
      cacheRef.current.set(scene.query, json.videos || []);

      // 데이터 상태 업데이트
      setData((prev) => ({
        ...prev,
        [sceneId]: json.videos || [],
      }));

      console.log(
        `[BrollPicker] 씬 ${sceneId} B-roll 새로고침 완료:`,
        json.videos?.length || 0,
        "개 영상"
      );
    } catch (e) {
      console.error("[BrollPicker] 개별 씬 새로고침 실패:", e);
    } finally {
      // 해당 씬의 로딩 상태 해제
      setRefreshingScenes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sceneId);
        return newSet;
      });
    }
  }

  async function load(force = false) {
    setLoading(true);
    try {
      // 캐시에 있는 건 재사용, 없는 쿼리만 서버에 요청
      const missing = items.filter((it) =>
        force ? true : !cacheRef.current.has(it.query)
      );

      if (missing.length > 0) {
        const res = await fetch("/api/broll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: missing }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);

        // 캐시에 저장
        json.forEach((row) => {
          const matched = missing.find((m) => m.id === row.id);
          if (matched) {
            cacheRef.current.set(matched.query, row.results || []);
          }
        });
      }

      // items 순서에 맞춰 결과 매핑
      const merged = items.map((it) => ({
        id: it.id,
        query: it.query,
        results: cacheRef.current.get(it.query) || [],
      }));
      setData(merged);
    } catch (e) {
      console.error(e);
      setData(items.map((it) => ({ id: it.id, query: it.query, results: [] })));
    } finally {
      setLoading(false);
    }
  }

  // 최초/쿼리 변경 시에만 검색
  useEffect(() => {
    if (items.length) load(false);
  }, [signature, items.length, load]); // 의존성 배열에 필요한 값들 추가

  if (!story) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={() => load(true)}
          disabled={loading}
        >
          전체 다시 검색
        </Button>
        <Button
          variant="outlined"
          startIcon={<VideoLibrary />}
          onClick={() => load(false)}
          disabled={loading}
        >
          캐시 활용 갱신
        </Button>
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              검색 중...
            </Typography>
          </Box>
        )}
      </Box>

      {data?.map((row, idx) => {
        const selected = (story.scenes || []).find(
          (s, i) => (s.id || `s${i + 1}`) === row.id
        )?.broll;

        return (
          <Card key={row.id} variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">씬 #{idx + 1}</Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      refreshingScenes.has(row.id) ? (
                        <CircularProgress size={16} />
                      ) : (
                        <RefreshOutlined />
                      )
                    }
                    onClick={() => refreshScene(row.id)}
                    disabled={loading || refreshingScenes.has(row.id)}
                    sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1 }}
                  >
                    새로고침
                  </Button>
                  {selected ? (
                    <Chip
                      label="선택됨"
                      icon={<CheckCircle />}
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip label="미선택" color="default" size="small" />
                  )}
                </Box>
              </Box>

              {/* B-roll 프롬프트 표시 및 수정 */}
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    B-roll 프롬프트:
                  </Typography>
                  {!editingPrompts.has(row.id) && (
                    <IconButton
                      size="small"
                      onClick={() => startEditPrompt(row.id)}
                      sx={{ p: 0.5 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {editingPrompts.has(row.id) ? (
                  <Box
                    sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      value={tempPrompts[row.id] || ""}
                      onChange={(e) =>
                        setTempPrompts((prev) => ({
                          ...prev,
                          [row.id]: e.target.value,
                        }))
                      }
                      placeholder="영어 키워드로 B-roll 검색어 입력"
                      variant="outlined"
                      multiline
                      rows={2}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => savePrompt(row.id)}
                        color="primary"
                        sx={{ p: 0.5 }}
                      >
                        <Save fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => cancelEditPrompt(row.id)}
                        color="inherit"
                        sx={{ p: 0.5 }}
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      p: 1,
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      fontStyle: "italic",
                      color: "text.secondary",
                    }}
                  >
                    {story.scenes?.find(
                      (s) =>
                        (s.id || `s${story.scenes.indexOf(s) + 1}`) === row.id
                    )?.brollPrompt || "프롬프트 없음"}
                  </Typography>
                )}
              </Box>

              {selected && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    mb: 2,
                    p: 2,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                  }}
                >
                  <video
                    src={selected.url}
                    style={{ width: 160, borderRadius: 8 }}
                    muted
                    controls
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => onPick?.(row.id, null)}
                  >
                    선택 해제
                  </Button>
                </Box>
              )}

              <Grid2 container spacing={2}>
                {(row.results || []).map((r) => (
                  <Grid2
                    item
                    xs={6}
                    sm={4}
                    md={3}
                    key={`${row.id}-${r.id}-${r.url}`}
                  >
                    <Card variant="outlined" sx={{ height: "100%" }}>
                      <video
                        src={r.url}
                        style={{ width: "100%", borderRadius: "4px 4px 0 0" }}
                        controls
                        muted
                      />
                      <CardContent sx={{ p: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          fullWidth
                          onClick={() => onPick?.(row.id, r)}
                        >
                          선택
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid2>
                ))}
                {(row.results || []).length === 0 && (
                  <Grid2 item xs={12}>
                    <Alert severity="info">검색 결과가 없습니다.</Alert>
                  </Grid2>
                )}
              </Grid2>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
