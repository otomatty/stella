/**
 * Web の Worker (画面の静的ファイル + API への中継)。
 *
 * 本番は Cloudflare Access が Web のホスト名を守る。画面は API を同じオリジンの `/api/*` で呼び、
 * ブラウザは Access の Cookie (`CF_Authorization`) を自動で送る。Access はこの Worker への
 * リクエストに `Cf-Access-Jwt-Assertion` を付けるので、`/api/*` はそのまま (ヘッダを書き換えず)
 * サービスバインディングで API の Worker (`stella-api`) へ渡す。API は署名を確かめて利用者を決める。
 * CF-Connecting-IP・cf-ipcountry も消さずに渡す (セキュリティ監視が IP と国を記録する)。
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
    if (pathname.startsWith("/api/")) {
      return env.API.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
