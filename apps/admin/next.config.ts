import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname, "../..") },
  images: { remotePatterns: [{ protocol: "https", hostname: "ibiza-mz.vercel.app", pathname: "/brand/ibiza-oficial.png" }] },
};

export default nextConfig;
