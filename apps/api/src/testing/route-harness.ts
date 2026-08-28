/**
 * route テスト用の HTTP ハーネス。
 *
 * 各 route テストが同じ `createTestApp` / `request` を書き写しており、 とくに
 * `request` は 3 ファイルにほぼ同一の実装があった。 直すときに全部を直せず
 * 挙動がずれるので、 ここ 1 か所に寄せる。
 *
 * 本番コードではなくテストの足場なので、 `src/lib` (実行時に読まれるモジュール群)
 * ではなくこのディレクトリに置く。 `lib/test-data.ts` は「新規ユーザーに配る
 * サンプルデータ」という別物なので、 名前で紛れないようにする意図もある。
 */
import { Hono } from "hono";

import type { Env } from "../env.js";

export type RouteApp = Hono<{ Bindings: Env }>;

/**
 * 渡された route だけを載せた Hono アプリを組み立てる。
 * 複数渡せるのは、 1 本のアプリに複数 route を載せた状態を見たいテストがあるため
 * (面談対策 + スキルシートの組み合わせなど)。
 */
export function mountTestApp(env: Env, ...routes: RouteApp[]): { app: RouteApp; env: Env } {
  const app = new Hono<{ Bindings: Env }>();
  for (const route of routes) app.route("/", route);
  return { app, env };
}

/**
 * テストからのリクエスト 1 本。
 * `token` を渡すと Authorization を、 文字列 body に Content-Type 未指定なら
 * application/json を補う (呼び出し側が明示していればそちらを優先する)。
 */
// `app.request()` は Promise<Response> | Response を返すため、 await して
// 呼び出し側からは常に Promise<Response> に見えるようにする。
export async function request(
  app: RouteApp,
  env: Env,
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return await app.request(path, { ...init, headers }, env);
}

/**
 * JSON 本文を、 そのテストが検証したい形で読む。
 *
 * `Response.json()` は `unknown` を返すので、 受け側で形を宣言しないと本文の
 * どのキーも触れない。 形の宣言を各テストに任せつつ、 キャストはここ 1 か所に
 * 閉じ込める。
 */
export async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
