export const MATERIALS_BUCKET_NAME = "stella-materials-public";

export function materialsCorsRules(webOrigin: string) {
  const url = new URL(webOrigin);
  if (url.protocol !== "https:" || webOrigin !== url.origin)
    throw new Error("Materials web origin must be an HTTPS origin without a path");
  return {
    rules: [
      {
        allowed: {
          origins: [webOrigin, "http://localhost:5173", "http://127.0.0.1:5173"],
          methods: ["GET", "HEAD"],
          headers: ["Range"],
        },
        exposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges"],
        maxAgeSeconds: 3600,
      },
    ],
  };
}

/** CI only: restore the public materials bucket's CORS policy on every deployment. */
export async function ensureMaterialsCors(
  accountId: string,
  apiToken: string,
  webOrigin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !apiToken)
    throw new Error("Cloudflare account and API token are required");
  const body = materialsCorsRules(webOrigin);
  const response = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${MATERIALS_BUCKET_NAME}/cors`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`Materials CORS request failed: HTTP ${response.status}`);
  const result = (await response.json()) as { success?: boolean } | null;
  if (result?.success !== true) throw new Error("Materials CORS request was not successful");
}
