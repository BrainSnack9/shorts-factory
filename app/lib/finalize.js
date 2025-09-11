"use client";

import { getFFmpeg, writeFile, fetchAsBlob } from "./ff";
import { base64ToBlob } from "./tts";

const OUT_W = 480; // 메모리 문제 방지를 위해 해상도 감소
const OUT_H = 854; // 16:9 비율 대신 더 작은 해상도 사용
const FPS = 24; // FPS도 낮춰서 메모리 사용량 감소
const FONT_PUBLIC_PATH = "/NotoSansKR-Bold.ttf";

// 텍스트 길이에 따른 duration 계산 함수
export function calculateDurationFromText(text) {
  if (!text || typeof text !== "string") return 3; // 기본값 3초

  const cleanText = text.trim();
  if (!cleanText) return 3;

  // 한국어 기준 분당 220자 읽기 속도 (TTS 기준)
  const charsPerMinute = 220;
  const charsPerSecond = charsPerMinute / 60;

  // 최소 2초, 최대 30초로 제한
  const calculatedDuration = Math.max(
    2,
    Math.min(30, cleanText.length / charsPerSecond)
  );

  return Math.round(calculatedDuration * 10) / 10; // 소수점 첫째자리까지
}

/** 이름 있는 export (중요) */
export async function buildFinalMP4(story, audioList) {
  try {
    const ff = await getFFmpeg();

    // 총 예상 길이 계산 및 로깅
    const expectedTotalDuration =
      story.scenes?.reduce((sum, scene) => {
        const sceneDur = Math.max(
          1,
          Math.min(30, Number(scene.durationSec || 3))
        );
        return sum + sceneDur;
      }, 0) || 0;

    console.log(
      "[finalize] 합성 시작 - 예상 총 길이:",
      expectedTotalDuration,
      "초"
    );
    console.log(
      "[finalize] 씬별 예상 길이:",
      story.scenes?.map((s, i) => ({
        씬: i + 1,
        설정값: s.durationSec,
        실제사용: Math.max(1, Math.min(30, Number(s.durationSec || 3))),
      }))
    );

    // 0) 폰트 적재 (실패해도 진행)
    let hasFont = true;
    try {
      const fontBlob = await fetchAsBlob(FONT_PUBLIC_PATH);
      await writeFile(ff, "NotoSansKR-Bold.ttf", fontBlob);
    } catch (e) {
      console.warn("[finalize] 폰트 로드 실패, 텍스트 없이 진행:", e.message);
      hasFont = false;
    }

    // 1) 오디오 맵
    const audioMap = new Map();
    (audioList || []).forEach((a) => audioMap.set(a.id, a));

    const scenes = Array.isArray(story?.scenes) ? story.scenes : [];
    if (!scenes.length) throw new Error("No scenes in story.");
    const sceneOuts = [];

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const id = s.id || `s${i + 1}`;

      const dur = Math.max(1, Math.min(30, Number(s.durationSec || 3))); // 씬당 최대 30초로 확장
      const raw = String(s.onScreenText ?? s.voiceover ?? "").trim();
      console.log(`[finalize] 씬 ${id} 정보:`, {
        원본durationSec: s.durationSec,
        실제사용dur: dur,
        onScreenText: s.onScreenText,
        voiceover: s.voiceover,
        raw: raw,
        isEmpty: !raw,
      });
      const safeText = raw
        .replace(/\\/g, "\\\\")
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\'");

      // 비디오 입력
      let videoInName = null;
      if (s.broll?.url) {
        try {
          const vblob = await fetchAsBlob(s.broll.url);
          videoInName = `in_${id}.mp4`;
          await writeFile(ff, videoInName, vblob);
        } catch (e) {
          console.warn("[finalize] B-roll 로드 실패, 배경색 사용:", e.message);
        }
      }

      // 오디오 입력
      let audioInName = null;
      const a = audioMap.get(id);
      if (a?.base64) {
        try {
          const ablob = base64ToBlob(a.base64, a.mime || "audio/mpeg");
          audioInName = `aud_${id}.mp3`;
          await writeFile(ff, audioInName, ablob);
        } catch (e) {
          console.warn("[finalize] 오디오 처리 실패:", e.message);
        }
      }

      const outName = `scene_${id}.mp4`;
      // 간단한 스케일링만 사용 (aspect ratio 유지 없이)
      const scaleCrop = `scale=${OUT_W}:${OUT_H}`;
      // 텍스트가 비어있으면 drawtext 필터 사용하지 않음
      const drawtext = safeText
        ? `drawtext=fontfile=NotoSansKR-Bold.ttf:` +
          `text='${safeText}':fontcolor=${s.textColor || "#ffffff"}:` +
          `fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2:` +
          `box=1:boxcolor=0x00000077:boxborderw=24:line_spacing=10`
        : null;

      try {
        if (videoInName) {
          const videoFilters = [];
          videoFilters.push(scaleCrop);
          if (hasFont && drawtext) {
            videoFilters.push(drawtext);
            console.log(
              `[finalize] 씬 ${id} 비디오+텍스트 필터:`,
              videoFilters.join(",")
            );
          } else {
            console.log(
              `[finalize] 씬 ${id} 비디오만 (텍스트 없음):`,
              videoFilters.join(",")
            );
          }

          await ff.exec([
            "-i",
            videoInName,
            "-t",
            String(dur),
            "-an",
            "-vf",
            videoFilters.join(","),
            "-r",
            String(FPS),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast", // 빠른 인코딩으로 메모리 사용량 감소
            "-crf",
            "28", // 품질 낮춤으로 메모리 절약
            "-pix_fmt",
            "yuv420p",
            "-y",
            outName,
          ]);
        } else {
          const colorArgs = [
            "-f",
            "lavfi",
            "-t",
            String(dur),
            "-i",
            `color=c=${s.bgColor || "#0d0d0d"}:s=${OUT_W}x${OUT_H}:r=${FPS}`,
          ];

          if (hasFont && drawtext) {
            colorArgs.push("-vf", drawtext);
          }

          colorArgs.push(
            "-r",
            String(FPS),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-pix_fmt",
            "yuv420p",
            "-y",
            outName
          );

          await ff.exec(colorArgs);
        }
      } catch (e) {
        console.warn("[finalize] 비디오 처리 실패, 폴백 시도:", e.message);
        if (videoInName) {
          const fallbackFilters = [scaleCrop];
          if (hasFont && drawtext) {
            fallbackFilters.push(drawtext);
          }

          await ff.exec([
            "-i",
            videoInName,
            "-t",
            String(dur),
            "-an",
            "-vf",
            fallbackFilters.join(","),
            "-r",
            String(FPS),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-pix_fmt",
            "yuv420p",
            "-y",
            outName,
          ]);
        } else {
          const fallbackColorArgs = [
            "-f",
            "lavfi",
            "-t",
            String(dur),
            "-i",
            `color=c=${s.bgColor || "#0d0d0d"}:s=${OUT_W}x${OUT_H}:r=${FPS}`,
          ];

          if (hasFont && drawtext) {
            fallbackColorArgs.push("-vf", drawtext);
          }

          fallbackColorArgs.push(
            "-r",
            String(FPS),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-pix_fmt",
            "yuv420p",
            "-y",
            outName
          );

          await ff.exec(fallbackColorArgs);
        }
      }

      // 오디오 결합
      if (audioInName) {
        const muxOut = `scene_${id}_mux.mp4`;
        try {
          await ff.exec([
            "-i",
            outName,
            "-i",
            audioInName,
            "-t",
            String(dur),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-shortest",
            "-y",
            muxOut,
          ]);
          sceneOuts.push(muxOut);
        } catch (e) {
          console.warn(
            "[finalize] 오디오 결합 실패, 비디오만 사용:",
            e.message
          );
          sceneOuts.push(outName);
        }
      } else {
        sceneOuts.push(outName);
      }
    }

    // concat
    if (sceneOuts.length === 0) {
      throw new Error("생성된 씬 파일이 없습니다.");
    }

    // 단일 파일인 경우 concat 없이 바로 반환
    if (sceneOuts.length === 1) {
      const data = await ff.readFile(sceneOuts[0]);
      await cleanupFFmpegFiles(ff);
      return new Blob([data], { type: "video/mp4" });
    }

    const listTxt = sceneOuts.map((n) => `file '${n}'`).join("\n");

    try {
      await ff.writeFile("list.txt", new TextEncoder().encode(listTxt));
    } catch (e) {
      console.error("[finalize] concat 목록 파일 생성 실패:", e);
      throw new Error("concat 목록 파일 생성 실패: " + e.message);
    }

    const concatOut = "concat_tmp.mp4";

    try {
      await ff.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "list.txt",
        "-c",
        "copy",
        "-y",
        concatOut,
      ]);
    } catch (e) {
      console.warn("[finalize] concat copy 실패, re-encode 시도:", e.message);
      try {
        await ff.exec([
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          "list.txt",
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          "-y",
          concatOut,
        ]);
      } catch (e2) {
        console.error("[finalize] concat 완전 실패:", e2);
        throw new Error("비디오 합치기 실패: " + e2.message);
      }
    }

    const data = await ff.readFile(concatOut);

    // 작업 완료 후 FFmpeg 파일 시스템 정리
    await cleanupFFmpegFiles(ff);

    return new Blob([data], { type: "video/mp4" });
  } catch (e) {
    console.error("[finalize] 합성 실패:", e);

    // 에러 발생 시에도 정리 시도
    try {
      await cleanupFFmpegFiles(ff);
    } catch (cleanupError) {
      console.warn("[finalize] 정리 실패:", cleanupError.message);
    }

    throw e;
  }
}

/** FFmpeg 파일 시스템 정리 함수 */
async function cleanupFFmpegFiles(ff) {
  const filesToClean = [
    // 임시 파일들
    "list.txt",
    "concat_tmp.mp4",
    "NotoSansKR-Bold.ttf",
    "_selftest.mp4",
  ];

  // 씬별 파일들 (최대 10개 씬 가정)
  for (let i = 1; i <= 10; i++) {
    filesToClean.push(`in_s${i}.mp4`);
    filesToClean.push(`aud_s${i}.mp3`);
    filesToClean.push(`scene_s${i}.mp4`);
    filesToClean.push(`scene_s${i}_mux.mp4`);
  }

  for (const fileName of filesToClean) {
    try {
      await ff.deleteFile(fileName);
    } catch (e) {
      // 파일이 없거나 삭제 실패는 무시 (정상적인 상황)
    }
  }
}
