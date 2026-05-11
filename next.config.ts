import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "talent-api.keens.academy",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
