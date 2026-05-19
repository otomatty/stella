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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-sqljs': ['sql.js'],
          'vendor-quickjs': [
            'quickjs-emscripten-core',
            '@jitl/quickjs-singlefile-browser-release-sync',
          ],
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
