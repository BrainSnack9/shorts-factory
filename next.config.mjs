/** @type {import('next').NextConfig} */
const nextConfig = {
  // HTTPS 개발 서버 설정
  server: {
    https: {
      key: "./cert.key",
      cert: "./cert.crt",
    },
  },
  // SharedArrayBuffer를 위한 조건부 헤더 설정
  async headers() {
    // 환경 변수로 COEP 헤더 제어 가능
    const enableCOEP = process.env.ENABLE_COEP === "true";

    if (!enableCOEP) {
      return [];
    }

    // COEP 헤더 적용 (SharedArrayBuffer 활성화)
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
  // FFmpeg 관련 모듈을 위한 Webpack 설정
  webpack: (config, { isServer }) => {
    // 서버 사이드에서는 FFmpeg 모듈을 완전히 제외
    if (isServer) {
      config.externals = config.externals || [];
      // 함수 형태로 externals 추가하여 더 강력한 제외
      config.externals.push(({ request }, callback) => {
        if (request === "@ffmpeg/ffmpeg" || request === "@ffmpeg/util") {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    } else {
      // 클라이언트 사이드 fallback 설정
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
