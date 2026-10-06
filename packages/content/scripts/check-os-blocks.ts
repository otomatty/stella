/**
 * OS 別のブロック (`:::os windows` / `:::os macos`) の検査。`content:check` に含まれる。
 *
 *   bun run --filter=@stella/content check:os
 *
 * 規則は src/os-blocks-check.ts、記法は @stella/shared/markdown/os-blocks。
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkOsBlocks } from "../src/os-blocks-check.js";

const coursesRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "courses");
const diagnostics = checkOsBlocks(coursesRoot);
for (const d of diagnostics)
  console.error(`courses/${d.file}${d.line > 0 ? `:${d.line}` : ""} — ${d.message}`);
console.log(`OS 別のブロック: エラー ${diagnostics.length} 件`);
if (diagnostics.length > 0) process.exitCode = 1;
