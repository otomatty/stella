import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseD1Config } from "./lib/d1-remote.js";
import { retireLessonPdfs } from "./lib/lesson-pdf-retire.js";

try {
  const config = readFileSync(join(import.meta.dirname, "../wrangler.toml"), "utf8");
  const { accountId, databaseId } = parseD1Config(config, "stella-db");
  const configured = (config.split(/^[\[]/m)[0] ?? "").match(/^\s*account_id\s*=\s*"(.+?)"/m)?.[1];
  if (accountId !== configured) throw new Error("wrangler.toml の account_id と一致しません");
  await retireLessonPdfs({
    accountId,
    databaseId,
    apiToken: process.env.CLOUDFLARE_API_TOKEN ?? "",
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "配布 PDF の片付けに失敗しました");
  process.exitCode = 1;
}
