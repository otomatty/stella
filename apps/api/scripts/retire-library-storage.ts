import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseD1Config } from "./lib/d1-remote.js";
import { retireLibraryStorage } from "./lib/library-retire.js";

try {
  const config = readFileSync(join(import.meta.dirname, "../wrangler.toml"), "utf8");
  const { accountId } = parseD1Config(config, "stella-db");
  const configured = (config.split(/^\[/m)[0] ?? "").match(/^\s*account_id\s*=\s*"(.+?)"/m)?.[1];
  if (accountId !== configured) throw new Error("Cloudflare account does not match STELLA config");
  const result = await retireLibraryStorage(accountId, process.env.CLOUDFLARE_API_TOKEN ?? "");
  const messages = {
    absent: "本棚のバケットはもう無い。",
    deleted: "本棚のバケットを削除した。",
    scheduled: "中身の削除を予約した。次のデプロイでバケットを消す。",
  };
  console.log(messages[result]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Library retirement failed");
  process.exitCode = 1;
}
