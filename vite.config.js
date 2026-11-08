import { defineConfig } from "vite";

// base를 './'로 두면 GitHub Pages의 하위 경로(/저장소이름/)와 일반 도메인 루트 어디에 올려도 동작한다.
export default defineConfig({
  base: "./",
  build: { outDir: "dist", sourcemap: false, target: "es2020" },
});
