import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 모든 미디어는 같은 오리진의 /api/media/* 프록시를 거치므로 remotePatterns 가
    // 필요 없다 (lib/media-url.ts 참고). unoptimized 는 Vercel image-optimizer 를
    // 우회하기 위한 기존 설정을 유지한다 — 최적화 경로가 프록시 응답을 다시 캐싱해
    // 미성년 PII 를 공용 캐시에 남기는 것도 함께 막는다.
    unoptimized: true,
  },
};

export default nextConfig;
