import { chmodSync } from "node:fs";
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/stella.mjs",
  format: "esm",
  platform: "node",
  target: "node22",
  legalComments: "none",
  minifyWhitespace: true,
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "info",
});

chmodSync("dist/stella.mjs", 0o755);
