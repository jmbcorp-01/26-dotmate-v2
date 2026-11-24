import type { NextConfig } from "next";

// 관리자 화면도 정적 파일로 빌드해 S3 + CloudFront(admin.dotmate.co.kr)에 올립니다.
// 데이터는 브라우저에서 영업 API(Lambda)로 직접 불러옵니다.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  agentRules: false,
};

export default nextConfig;
