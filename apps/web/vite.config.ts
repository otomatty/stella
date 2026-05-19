import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { copySqlJsWasm } from './vite-plugins/copy-sqljs-wasm.js';
import { copyPdfjsAssets } from './vite-plugins/copy-pdfjs-assets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), copySqlJsWasm(), copyPdfjsAssets()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-codemirror': [
            '@uiw/react-codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/lang-javascript',
            '@codemirror/lang-sql',
            '@codemirror/lint',
          ],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'rehype-highlight', 'highlight.js'],
        },
      },
    },
  },
});
