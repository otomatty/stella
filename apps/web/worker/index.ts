/**
 * Web の Worker (画面の静的ファイル + API への中継)。
 *
 * `/api/*` をサービスバインディングで API の Worker (`stella-api`) へ渡す。画面と API が同じ
 * オリジンになるので、ログイン (Better Auth) のセッションを HttpOnly の Cookie で持てる
 * (トークンを localStorage に置かない)。CF-Connecting-IP もそのまま渡す (監査ログが IP を残す)。
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
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    return pathname.startsWith("/api/") ? env.API.fetch(request) : env.ASSETS.fetch(request);
  },
};
