"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  CloudUpload,
  AttachFile,
} from "@mui/icons-material";

export default function BrollPicker({ story, onPick, onStoryChange }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshingScenes, setRefreshingScenes] = useState(new Set());
  const [editingPrompts, setEditingPrompts] = useState(new Set());
  const [tempPrompts, setTempPrompts] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(new Set());
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

  // 파일 업로드 함수
  const handleFileUpload = async (sceneId, file) => {
    if (!file) return;

    // 파일 타입 검증 (비디오 또는 이미지)
    if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
      alert("비디오 또는 이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 검증 (100MB 제한)
    if (file.size > 100 * 1024 * 1024) {
      alert("파일 크기는 100MB를 초과할 수 없습니다.");
      return;
    }

    setUploadingFiles((prev) => new Set(prev).add(sceneId));

    try {
      // 파일을 URL로 변환
      const videoUrl = URL.createObjectURL(file);

      // 임시 미디어 객체 생성
      const tempMedia = {
        id: `uploaded_${Date.now()}`,
        url: videoUrl,
        width: 1920, // 기본값
        height: 1080, // 기본값
        duration: 10, // 기본값
        title: file.name,
        isUploaded: true,
        isImage: file.type.startsWith("image/"),
        fileType: file.type,
      };

      // 해당 씬의 B-roll로 선택
      onPick(sceneId, tempMedia);

      console.log(
        `[BrollPicker] 씬 ${sceneId}에 업로드된 파일 적용:`,
        file.name
      );
    } catch (error) {
      console.error("[BrollPicker] 파일 업로드 실패:", error);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sceneId);
        return newSet;
      });
    }
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

      // 해당 쿼리만 다시 요청 (API 형식에 맞춤)
      const res = await fetch("/api/broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: sceneId, query: scene.query }] }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // API 응답에서 해당 씬의 결과 추출
      const sceneResult = json.find((item) => item.id === sceneId);
      const videos = sceneResult?.results || [];

      // 캐시에 저장하지 않음 (다음 새로고침에서 새로운 결과를 위해)
      // cacheRef.current.set(scene.query, videos);

      // 데이터 상태 업데이트
      setData((prev) => {
        const updated = prev.map((item) =>
          item.id === sceneId ? { ...item, results: videos } : item
        );
        return updated;
      });

      console.log(
        `[BrollPicker] 씬 ${sceneId} B-roll 새로고침 완료:`,
        videos.length,
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

  const load = useCallback(
    async (force = false) => {
      console.log(`[BrollPicker] load 함수 호출 - force: ${force}`);
      setLoading(true);
      try {
        // force=true일 때는 캐시 무시하고 모든 쿼리 재검색
        const missing = force
          ? items // force=true면 모든 쿼리 재검색
          : items.filter((it) => !cacheRef.current.has(it.query)); // force=false면 캐시에 없는 것만

        console.log(
          `[BrollPicker] 검색할 쿼리 개수: ${missing.length}개 (전체: ${items.length}개)`
        );
        console.log(
          `[BrollPicker] 캐시 상태:`,
          Array.from(cacheRef.current.keys())
        );

        if (missing.length > 0) {
          const res = await fetch("/api/broll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: missing }),
          });
          const json = await res.json();
          if (json.error) throw new Error(json.error);

          // force=false일 때만 캐시에 저장 (force=true면 매번 새로운 결과를 위해 캐시 저장 안함)
          if (!force) {
            json.forEach((row) => {
              const matched = missing.find((m) => m.id === row.id);
              if (matched) {
                cacheRef.current.set(matched.query, row.results || []);
              }
            });
          }
        }

        // items 순서에 맞춰 결과 매핑
        const merged = items.map((it) => {
          if (force) {
            // force=true일 때는 API 응답에서 직접 결과 가져오기
            const apiResult = json?.find((row) => row.id === it.id);
            return {
              id: it.id,
              query: it.query,
              results: apiResult?.results || [],
            };
          } else {
            // force=false일 때는 캐시에서 가져오기
            return {
              id: it.id,
              query: it.query,
              results: cacheRef.current.get(it.query) || [],
            };
          }
        });
        setData(merged);
      } catch (e) {
        console.error(e);
        setData(
          items.map((it) => ({ id: it.id, query: it.query, results: [] }))
        );
      } finally {
        setLoading(false);
      }
    },
    [items]
  );

  // 최초에만 검색 (탭 이동 시 재검색 방지)
  useEffect(() => {
    if (items.length && data.length === 0) {
      load(false);
    }
  }, [items.length, load, data.length]);

  if (!story) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={() => {
            console.log("[BrollPicker] 전체 다시 검색 버튼 클릭됨");
            load(true);
          }}
          disabled={loading}
        >
          전체 다시 검색
        </Button>
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              검색 중...
            </Typography>
          </Box>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: "auto", fontSize: "0.7rem" }}
        >
          💡 업로드: MP4, MOV, JPG, PNG, GIF (최대 100MB)
        </Typography>
      </Box>

      {data.map((row, idx) => {
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
                <Typography variant="h6" sx={{ fontSize: "20px" }}>
                  씬 #{idx + 1}
                </Typography>
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

                  <input
                    type="file"
                    accept="video/*,image/*"
                    style={{ display: "none" }}
                    id={`file-upload-${row.id}`}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleFileUpload(row.id, file);
                      e.target.value = ""; // 같은 파일 재선택 가능하도록
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      uploadingFiles.has(row.id) ? (
                        <CircularProgress size={16} />
                      ) : (
                        <CloudUpload />
                      )
                    }
                    onClick={() =>
                      document.getElementById(`file-upload-${row.id}`).click()
                    }
                    disabled={uploadingFiles.has(row.id)}
                    sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1 }}
                  >
                    업로드
                  </Button>

                  {selected ? (
                    <Chip
                      label={
                        selected.isUploaded
                          ? selected.isImage
                            ? "이미지"
                            : "비디오"
                          : "선택됨"
                      }
                      icon={<CheckCircle />}
                      color={selected.isUploaded ? "info" : "success"}
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
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: "14px",
                          "& textarea": {
                            fontSize: "14px",
                          },
                        },
                      }}
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
                  {selected.isImage ? (
                    <img
                      src={selected.url}
                      alt={selected.title || "업로드된 이미지"}
                      style={{
                        width: 160,
                        height: 90,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <video
                      src={
                        selected.url.startsWith("http")
                          ? `/api/proxy-video?url=${encodeURIComponent(selected.url)}`
                          : selected.url
                      }
                      style={{
                        width: 160,
                        height: 90,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                      muted
                      controls
                    />
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      {selected.isUploaded
                        ? selected.isImage
                          ? "업로드된 이미지"
                          : "업로드된 비디오"
                        : "검색된 영상"}
                    </Typography>
                    {selected.title && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 1 }}
                      >
                        {selected.title}
                      </Typography>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => onPick?.(row.id, null)}
                      size="small"
                    >
                      선택 해제
                    </Button>
                  </Box>
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
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #2a2a2a",
                      }}
                    >
                      <video
                        src={
                          r.url.startsWith("http")
                            ? `/api/proxy-video?url=${encodeURIComponent(r.url)}`
                            : r.url
                        }
                        style={{
                          width: "100%",
                          height: 250,
                          borderRadius: "4px 4px 0 0",
                          objectFit: "cover",
                        }}
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
