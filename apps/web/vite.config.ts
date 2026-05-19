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
});
