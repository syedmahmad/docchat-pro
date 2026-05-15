import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Keep PDF stack on Node; bundling often breaks pdfjs / pdf-parse in App Router. */
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@langchain/community",
    "@langchain/classic",
  ],
};

export default nextConfig;
