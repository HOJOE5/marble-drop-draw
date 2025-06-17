import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// 👇 import 추가
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => ({
  base: "/marble-drop-draw/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    {
      name: 'copy-404',
      closeBundle: () => {
        const path404 = resolve(__dirname, 'dist/404.html');
        const pathIndex = resolve(__dirname, 'dist/index.html');
        if (fs.existsSync(pathIndex)) {
          fs.copyFileSync(pathIndex, path404);
        }
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
