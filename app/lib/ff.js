"use client";

let ffmpeg;
let FFmpegClass;
let fetchFileUtil;

/** FFmpeg 인스턴스 로드 (클라이언트 전용) */
export async function getFFmpeg() {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg은 브라우저에서만 사용할 수 있습니다.");
  }

  // 동적으로 모듈 로드
  if (!FFmpegClass) {
    try {
      const ffmpegModule = await import("@ffmpeg/ffmpeg");
      FFmpegClass = ffmpegModule.FFmpeg;
    } catch (e) {
      console.error("[ff] FFmpeg 모듈 로드 실패:", e);
      throw new Error("FFmpeg 모듈을 불러올 수 없습니다: " + e.message);
    }
  }

  if (!fetchFileUtil) {
    try {
      const utilModule = await import("@ffmpeg/util");
      fetchFileUtil = utilModule.fetchFile;
    } catch (e) {
      console.error("[ff] FFmpeg util 모듈 로드 실패:", e);
      throw new Error("FFmpeg util 모듈을 불러올 수 없습니다: " + e.message);
    }
  }

  if (!ffmpeg) {
    try {
      ffmpeg = new FFmpegClass();
    } catch (e) {
      console.error("[ff] FFmpeg 인스턴스 생성 실패:", e);
      throw e;
    }

    // 에러 이벤트만 로깅
    ffmpeg.on("error", (e) => console.error("[ffmpeg] 에러:", e));

    try {
      // 기본 로딩 시도
      await ffmpeg.load();
    } catch (e1) {
      // 수동 CDN 시도
      const CDN_OPTIONS = [
        "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd",
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd",
        "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm",
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm",
      ];

      let loadSuccess = false;
      let lastError = e1;

      for (let i = 0; i < CDN_OPTIONS.length; i++) {
        const BASE = CDN_OPTIONS[i];

        try {
          await ffmpeg.load({
            coreURL: `${BASE}/ffmpeg-core.js`,
            wasmURL: `${BASE}/ffmpeg-core.wasm`,
          });
          loadSuccess = true;
          break;
        } catch (e2) {
          try {
            await ffmpeg.load({
              coreURL: `${BASE}/ffmpeg-core.js`,
              wasmURL: `${BASE}/ffmpeg-core.wasm`,
              workerURL: `${BASE}/ffmpeg-core.worker.js`,
            });
            loadSuccess = true;
            break;
          } catch (e3) {
            lastError = e3;
          }
        }
      }

      if (!loadSuccess) {
        console.error("[ff] FFmpeg 로딩 실패");
        throw lastError;
      }
    }

    if (typeof window !== "undefined") {
      window.__ffmpeg__ = ffmpeg;
    }
  }
  return ffmpeg;
}

/** 파일 쓰기 (Blob/ArrayBuffer/URL 모두 처리) */
export async function writeFile(ff, path, input) {
  try {
    const data = await fetchFileUtil(input);
    await ff.writeFile(path, data);
  } catch (e) {
    console.error("[ff] 파일 쓰기 실패:", path, e);
    throw e;
  }
}

/** URL → Blob */
export async function fetchAsBlob(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      throw new Error("fetch failed: " + url);
    }
    return await r.blob();
  } catch (e) {
    console.error("[ff] URL 로드 실패:", url, e);
    throw e;
  }
}

/** 자가 테스트: 1초 컬러 mp4 생성 후 크기 반환 */
export async function ffSelfTest() {
  try {
    const ff = await getFFmpeg();
    await ff.exec([
      "-f",
      "lavfi",
      "-t",
      "1",
      "-i",
      "color=c=#222222:s=320x480:r=24",
      "-pix_fmt",
      "yuv420p",
      "-y",
      "_selftest.mp4",
    ]);
    const data = await ff.readFile("_selftest.mp4");
    return data.length;
  } catch (e) {
    console.error("[ff] 자가 테스트 실패:", e);
    throw e;
  }
}
