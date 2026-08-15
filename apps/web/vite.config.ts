import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { copySqlJsWasm } from "./vite-plugins/copy-sqljs-wasm.js";
import { copyPdfjsAssets } from "./vite-plugins/copy-pdfjs-assets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    // autoCodeSplitting は無効: 下記 manualChunks / lazy 設計に干渉させない。
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
    copySqlJsWasm(),
    copyPdfjsAssets(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  // Vite の worker.format は既定で "iife"。 メイン bundle 側の manualChunks が
  // worker 側にも漏れて IIFE では使えないコード分割エラーになる (#code-splitting worker IIFE)。
  // worker は ES モジュール (chunk 分割可) として出力する。
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        // 明示的な vendor チャンクは定義しない。 vendor チャンクを定義すると Vite の
        // preload ヘルパ等の共有モジュールがそこへ吸い込まれ、 entry が
        // そのチャンクを静的 import してしまう (lazy 化が無効になる) ため。
        // codemirror / pdf は lazy コンポーネント (AssignmentEditor /
        // SlidesViewer) からのみ参照されるので、
        // Rollup の自動分割でオンデマンドな共有チャンクになる。
        manualChunks(id: string) {
          // Vite の preload ヘルパが vendor チャンクへ混入して eager 化するのを防ぐ。
          if (id.includes("vite/preload-helper")) return "preload-helper";
          return undefined;
        },
      },
    },
  },
});
