/**
 * 教材パイプラインの「前回デプロイと同じか」判定 (Issue #266)。
 *
 *   bun run scripts/content-state.ts check --remote   # 変わったか (GITHUB_OUTPUT に changed=)
 *   bun run scripts/content-state.ts save --remote    # seed まで通ったあとに記録する
 *   bun run scripts/content-state.ts reset --remote   # 記録を消す (次回は必ずフル実行)
 *
 * 指紋の作り方と対象は lib/content-fingerprint.ts。記録先は教材バケットの
 * `deploy/content-state.json` で、中身はハッシュと更新時刻だけ。
 *
 * R2 のオブジェクトを手で消した / 別経路で壊した場合は `reset` してから
 * デプロイを Re-run する (指紋が一致する限り、R2 の実体は確認しない)。
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTENT_STATE_KEY,
  type ContentState,
  SEED_INPUT_PATHS,
  fingerprintFrom,
  parseContentState,
} from "./lib/content-fingerprint.js";
import { createR2Client } from "./lib/r2.js";
import { parseD1DatabaseId, readWranglerToml } from "./lib/wrangler-config.js";

const BUCKET = "stella-materials-public";
const DATABASE_NAME = "stella-db";
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, "..", "..", "..");

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("-")) ?? "check";
const remote = args.includes("--remote");

/**
 * PDF の R2 キーは PDF_KEY_SALT (repo Secret) 入りのハッシュ。塩を替えると全キーが
 * 変わるので、教材が 1 文字も動いていなくても PDF の作り直しと seed が要る。
 * リポジトリの中身だけ見ていると、その push を「変わっていない」と判定してしまう。
 *
 * 塩そのものは記録に出さない (指紋へ混ぜるだけ)。記録は公開バケットに置くため。
 */
function saltDigest(): string {
  const salt = process.env.PDF_KEY_SALT;
  return salt ? createHash("sha256").update(salt).digest("hex") : "none";
}

/**
 * seed の宛先 D1。記録は「この内容を **この DB へ** 入れ終えた」という意味なので、
 * DB を作り直す / 差し替える (wrangler.toml の database_id だけ動く) 変更で指紋が
 * 一致してしまうと、migration と API だけ新 DB に入り、教材の入っていない DB を
 * 指したまま成功扱いになる。
 *
 * wrangler.toml を丸ごと指紋の対象にはしない — ALLOWED_ORIGINS やモデル名など
 * seed と関係ない vars を触るたびに教材パイプラインを流し直すことになるため。
 */
function d1DatabaseId(): string {
  const id = parseD1DatabaseId(readWranglerToml(), DATABASE_NAME);
  if (!id) {
    throw new Error(`wrangler.toml に d1_databases "${DATABASE_NAME}" の database_id がありません`);
  }
  return id;
}

function currentFingerprint(): string {
  // ls-files は index を見る。CI の checkout は index = そのコミットなので、
  // 「このコミットの内容」と一致する。ローカルの未 add な変更は含まれない。
  const out = execFileSync("git", ["ls-files", "-s", "--", ...SEED_INPUT_PATHS], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return fingerprintFrom(out, SEED_INPUT_PATHS, {
    pdfKeySalt: saltDigest(),
    d1DatabaseId: d1DatabaseId(),
  });
}

function emit(changed: boolean, reason: string): void {
  console.log(`教材パイプライン: ${changed ? "実行" : "スキップ"} — ${reason}`);
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `changed=${changed}\n`);
}

const r2 = createR2Client(BUCKET, remote);
const fingerprint = currentFingerprint();

if (command === "check") {
  if (process.env.FORCE_CONTENT_SYNC === "1") {
    emit(true, "FORCE_CONTENT_SYNC=1");
  } else {
    let previous: ContentState | null = null;
    try {
      const body = await r2.get(CONTENT_STATE_KEY);
      previous = body === null ? null : parseContentState(new TextDecoder().decode(body));
    } catch (e) {
      // 読めないときは「変わった」に倒す。飛ばして取り違えるより、
      // 冪等なパイプラインをもう一度流す方が安い。
      emit(true, `記録を読めませんでした (${e instanceof Error ? e.message : String(e)})`);
      process.exit(0);
    }
    if (previous === null) {
      emit(true, "記録がありません (初回)");
    } else if (previous.fingerprint !== fingerprint) {
      emit(
        true,
        `内容が変わりました (${previous.fingerprint.slice(0, 12)} → ${fingerprint.slice(0, 12)})`,
      );
    } else {
      emit(false, `前回デプロイと同じ内容です (${fingerprint.slice(0, 12)})`);
    }
  }
} else if (command === "save") {
  const state: ContentState = {
    version: 1,
    fingerprint,
    updatedAt: new Date().toISOString(),
    ...(process.env.GITHUB_SHA ? { commit: process.env.GITHUB_SHA } : {}),
  };
  await r2.put(
    CONTENT_STATE_KEY,
    new TextEncoder().encode(JSON.stringify(state)),
    "application/json",
  );
  console.log(`✓ 教材パイプラインの指紋を記録しました (${fingerprint.slice(0, 12)})`);
} else if (command === "reset") {
  await r2.remove(CONTENT_STATE_KEY);
  console.log("✓ 記録を消しました (次のデプロイは教材パイプラインをフルで流します)");
} else {
  console.error(`不明なコマンド: ${command} (check / save / reset)`);
  process.exit(1);
}
