import type { NextConfig } from "next";

// 정적 사이트로 빌드해서 out/ 폴더를 AWS S3 + CloudFront에 올립니다.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
