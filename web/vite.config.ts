import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import process from "node:process";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_PAGES === "true" && repositoryName
  ? `/${repositoryName}/`
  : "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/recharts/")) return "charts";
          if (id.includes("/node_modules/lucide-react/")) return "icons";
        },
      },
    },
  },
  test: {
    environment: "node",
  },
});