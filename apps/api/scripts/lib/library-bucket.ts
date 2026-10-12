export const LIBRARY_BUCKET_NAME = "stella-library-private";

/** CI only: provision the fixed private bucket, then refuse any public domain configuration. */
export async function ensurePrivateLibraryBucket(
  accountId: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !apiToken)
    throw new Error("Cloudflare account and API token are required");
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    return fetchImpl(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
  }
  async function result(response: Response): Promise<unknown> {
    if (!response.ok) throw new Error(`Library bucket request failed: HTTP ${response.status}`);
    const body = (await response.json()) as { success?: boolean; result?: unknown } | null;
    if (body?.success !== true) throw new Error("Library bucket request was not successful");
    return body.result;
  }
  const existing = await call(`/${LIBRARY_BUCKET_NAME}`);
  if (existing.status === 404) {
    await existing.body?.cancel();
    await result(
      await call("", { method: "POST", body: JSON.stringify({ name: LIBRARY_BUCKET_NAME }) }),
    );
  } else {
    const bucket = (await result(existing)) as { name?: string } | null;
    if (bucket?.name !== LIBRARY_BUCKET_NAME) throw new Error("Unexpected library bucket");
  }
  const managed = (await result(await call(`/${LIBRARY_BUCKET_NAME}/domains/managed`))) as {
    enabled?: boolean;
  } | null;
  const custom = (await result(await call(`/${LIBRARY_BUCKET_NAME}/domains/custom`))) as {
    domains?: { enabled?: boolean }[];
  } | null;
  if (
    managed?.enabled !== false ||
    !Array.isArray(custom?.domains) ||
    custom.domains.some((domain) => domain?.enabled !== false)
  )
    throw new Error("The library bucket must have all public domains disabled");
}
