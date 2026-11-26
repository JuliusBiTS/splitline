import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The LLM system prompts are read from disk at request time (src/llm/prompts.ts).
  outputFileTracingIncludes: { "/api/**": ["./src/llm/prompts/**"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
