import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  // 排除 Next.js 内部文件
  server: {
    watch: {
      ignored: ["**/.next/**"],
    },
  },
});
