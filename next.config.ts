import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
