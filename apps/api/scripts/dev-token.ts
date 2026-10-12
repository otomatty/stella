/**
 * ローカル開発用のトークンを作って標準出力に出す (本番の認証は Clerk で、これは通らない)。
 *
 *   bun run --filter=@stella/api dev:token seed-admin
 *
 * `apps/api/.dev.vars` の `DEV_AUTH_JWT_SECRET` で署名する。出たトークンは、画面 (`bun run dev`) の
 * ログイン画面に貼るか、ブラウザの localStorage `stella_auth_token_v1` に入れる。API は Clerk が
 * 未設定かつ localhost へのリクエストのときだけ受け付ける (lib/authz.ts の resolveIdentity)。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { signAccessToken } from "../src/lib/auth-jwt.js";

function readDevVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const text = readFileSync(join(import.meta.dirname, "..", ".dev.vars"), "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0 || line.slice(0, eq).trim() !== key) continue;
      return line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    // .dev.vars が無ければ env だけを見る。
  }
  return undefined;
}

const profileId = process.argv[2] ?? "seed-learner";
const secret = readDevVar("DEV_AUTH_JWT_SECRET");
if (!secret) {
  console.error("DEV_AUTH_JWT_SECRET が見つかりません (apps/api/.dev.vars を確認してください)");
  process.exit(1);
}
process.stdout.write(`${await signAccessToken(secret, profileId, `${profileId}@example.local`)}\n`);
