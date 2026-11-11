import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@rollup/plugin-yaml";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), yaml()],
  resolve: { alias: { "@": r("./src"), "next/image": r("./src/shims/next-image.tsx") } },
  build: {
    rollupOptions: {
      input: { index: r("./index.html"), publication: r("./publication.html"), teach: r("./teach.html"), team: r("./team.html"), aiIntro: r("./teach/ai-intro/index.html") },
    },
  },
});
