/**
 * Web の Worker (画面の静的ファイル + API への中継)。
 *
 * 同じ画面を 2 つの入口で配る。
 *   - 受講者用 (`stella-web`) … ログインは Clerk。画面は Clerk のトークンを付けて `/api/*` を呼ぶ。
 *   - 講師・管理者用 (`stella-admin`) … Cloudflare Access で守る。Access はこの Worker へのリクエストに
 *     `Cf-Access-Jwt-Assertion` を付けるので、そのまま API に渡す (API は署名を確かめ、講師・管理者の
 *     操作をこれのあるリクエストだけ受ける)。
 *
 * `/api/*` はサービスバインディングで API の Worker (`stella-api`) へ渡す。CF-Connecting-IP・
 * cf-ipcountry も消さずに渡す (セキュリティ監視が IP と国を記録する)。受講者用の入口は Access の
 * 後ろに無いので、利用者が付けた `Cf-Access-Jwt-Assertion` を消してから渡す — 盗んだ講師の Access の
 * トークンを、Access の失効を確かめない入口から使い回させないため (`TRUST_ACCESS_ASSERTION` が "1"
 * の講師・管理者用の入口だけが渡す)。
 *
 * それ以外は静的ファイル (Vite の成果物)。`wrangler.toml` の `run_worker_first = ["/api/*"]` で
 * `/api/*` だけがこの Worker を先に通り、SPA の index.html への fallback に飲まれない。
 */

/** サービスバインディング / 静的ファイルのバインディング (どちらも fetch だけを使う)。 */
interface FetchBinding {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  /** API の Worker (`stella-api`) へのサービスバインディング。 */
  API: FetchBinding;
  /** Vite の成果物 (`dist`)。 */
  ASSETS: FetchBinding;
  /** "1" なら Access の付けたヘッダを API に渡す (講師・管理者用の入口だけ)。 */
  TRUST_ACCESS_ASSERTION?: string;
}

const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) {
      if (env.TRUST_ACCESS_ASSERTION === "1" || !request.headers.has(ACCESS_ASSERTION_HEADER)) {
        return env.API.fetch(request);
      }
      const headers = new Headers(request.headers);
      headers.delete(ACCESS_ASSERTION_HEADER);
      return env.API.fetch(new Request(request, { headers }));
    }
    return env.ASSETS.fetch(request);
  },
};
