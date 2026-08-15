import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const sqlJsEntry = require.resolve("sql.js", {
  paths: [path.resolve(here, "../../packages/code-runner")],
});
mkdirSync("dist", { recursive: true });
copyFileSync(
  path.join(path.dirname(sqlJsEntry), "sql-wasm.wasm"),
  path.join("dist", "sql-wasm.wasm"),
);

const processShim = "var process = globalThis.process || { env: { NODE_ENV: 'production' } };";

await esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
  logLevel: "info",
});

await esbuild.build({
  entryPoints: ["grader-webview/main.ts"],
  bundle: true,
  outfile: "dist/grader.js",
  format: "esm",
  platform: "browser",
  sourcemap: true,
  logLevel: "info",
  banner: { js: processShim },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

await esbuild.build({
  entryPoints: ["../../packages/code-runner/src/quickjs-worker.ts"],
  bundle: true,
  outfile: "dist/quickjs-worker.js",
  format: "esm",
  platform: "browser",
  sourcemap: true,
  logLevel: "info",
  banner: { js: processShim },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
