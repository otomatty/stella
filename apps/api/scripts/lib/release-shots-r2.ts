// 教材用クライアントは API の TypeScript rootDir 外にあるため、remote の put だけ実装する。
export function createRemoteR2Client(bucket: string, env: Record<string, string | undefined>) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID と CLOUDFLARE_API_TOKEN を設定してください");
  }

  const objects = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${bucket}/objects`;
  return {
    async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      const response = await fetch(`${objects}/${encodedKey}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
        body,
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
      if (!response.ok) throw new Error(`R2 PUT failed (HTTP ${response.status})`);
    },
  };
}
