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
} from "@mui/material";
import { Refresh, VideoLibrary, CheckCircle } from "@mui/icons-material";

export default function BrollPicker({ story, onPick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
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
  }, [signature]); // 선택만 바뀌면 signature가 그대로라 재검색 X

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
