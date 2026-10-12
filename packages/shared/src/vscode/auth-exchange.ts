/**
 * 交換が API に届く前に止められた (ログイン画面へのリダイレクト・HTML が返った) ときの案内。
 * 拡張の `stella.serverUrl` が、Cloudflare Access で守った講師・管理者用の入口を指していると起きる。
 * 本番は受講者用の Web の URL を指す。
 */
export const EXCHANGE_BLOCKED_MESSAGE =
  "接続コードの交換がサーバーの手前で止められました。設定 stella.serverUrl が受講者用の LMS の Web の URL (講師・管理者用の入口ではない) を指しているか確認してください";

function isHtml(res: Response): boolean {
  return /text\/html/i.test(res.headers.get("content-type") ?? "");
}

/** ログイン画面へのリダイレクト (`redirect: "manual"` では 3xx か opaqueredirect / status 0)。 */
function isRedirect(res: Response): boolean {
  return (
    res.type === "opaqueredirect" || res.status === 0 || (res.status >= 300 && res.status < 400)
  );
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (text.trim() === "") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * 接続コードをトークンに交換する。本番ではトークンは Clerk の API キー (30 日で切れる)、
 * ローカルでは開発用の JWT。
 */
export async function exchangeVscodeLink(
  serverUrl: string,
  code: string,
  fetchFn: typeof fetch,
): Promise<string> {
  const base = serverUrl.replace(/\/+$/, "");
  const res = await fetchFn(`${base}/api/auth/vscode-link/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    // Access のログイン画面へのリダイレクトを追わない (追うと HTML が返るだけで原因が分からない)。
    redirect: "manual",
  });

  if (isRedirect(res)) {
    throw new Error(EXCHANGE_BLOCKED_MESSAGE);
  }

  const data = await readJson(res);
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (!record && isHtml(res)) {
    // HTML の応答 (Access のブロック画面・Web の index.html) は API に届いていない。
    throw new Error(EXCHANGE_BLOCKED_MESSAGE);
  }
  const errorMessage = typeof record?.error === "string" ? record.error : undefined;

  if (!res.ok) {
    throw new Error(errorMessage ?? `接続コードの交換に失敗しました (${res.status})`);
  }

  if (typeof record?.access_token !== "string" || record.access_token === "") {
    throw new Error("接続コードの交換に失敗しました");
  }

  return record.access_token;
}
