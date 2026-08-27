import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Disable experimental Turbopack CSS loader issues */
  output: 'standalone'
};

export default nextConfig;
