import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// 저장소명이 "marble-drop-draw"니까 이걸 base로 설정
export default defineConfig(({ mode }) => ({
  base: "/marble-drop-draw/", // ✅ GitHub Pages 경로를 위한 설정
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

