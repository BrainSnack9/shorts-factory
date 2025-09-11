/** @type {import('next').NextConfig} */
const nextConfig = {
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
