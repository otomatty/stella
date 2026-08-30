/**
 * 画面が付ける独自ヘッダが CORS の許可リストに載っているか。
 *
 * プリフライトの `Access-Control-Allow-Headers` に無いヘッダを 1 つでも付けると、
 * ブラウザは **その API 呼び出しを丸ごと落とす** (認証もマップも通らない)。
 * ヘッダを足したのに `index.ts` の `allowHeaders` を忘れる、が全停止に直結するので、
 * 実際にプリフライトを投げて確かめる。
 *
 * 逆に言うと、**独自ヘッダを増やすこと自体が古い API との互換を壊す** (ロールバック
 * した瞬間、古い API の許可リストに無いヘッダで全ての呼び出しが落ちる)。版の申告を
 * ヘッダではなくクエリ引数にしてあるのはこのため (`SKILL_MAP_TIERS_PARAM`)。
 */

import { describe, expect, it } from "vitest";

import worker from "../index.js";
import type { Env } from "../env.js";
import { DEV_MODE_HEADER } from "./skill-map-data.js";

const ORIGIN = "http://localhost:5173";
const env = { ALLOWED_ORIGINS: ORIGIN } as Env;

/** 1 本ぶんのプリフライト。許可されたヘッダ名の集合 (小文字) を返す。 */
async function preflight(header: string): Promise<Set<string>> {
  const res = await worker.fetch(
    new Request(`${ORIGIN}/api/skill-map/mine`, {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": header,
      },
    }),
    env,
  );
  return new Set(
    (res.headers.get("Access-Control-Allow-Headers") ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name !== ""),
  );
}

describe("CORS の許可ヘッダ", () => {
  it("画面が全リクエストに付けるヘッダを許可する", async () => {
    const allowed = await preflight([DEV_MODE_HEADER, "Authorization", "Content-Type"].join(", "));
    // `api-client.ts` が全リクエストに付けるもの。1 つでも落ちると全 API が CORS で失敗する。
    expect(allowed).toContain(DEV_MODE_HEADER.toLowerCase());
    expect(allowed).toContain("authorization");
    expect(allowed).toContain("content-type");
  });
});
