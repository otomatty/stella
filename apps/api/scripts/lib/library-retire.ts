export const LIBRARY_BUCKET_NAME = "stella-library-private";

// Cloudflare R2 lifecycle ages are seconds; an empty prefix covers the entire bucket.
export const libraryRetirementRules = {
  rules: [
    {
      id: "retire-personal-library-2026-11",
      enabled: true,
      conditions: { prefix: "" },
      deleteObjectsTransition: { condition: { type: "Age", maxAge: 86_400 } },
      abortMultipartUploadsTransition: { condition: { type: "Age", maxAge: 86_400 } },
    },
  ],
};

type ApiBody = {
  success?: boolean;
  result?: { name?: string } | null;
  errors?: { code?: number; message?: string }[];
};

/** CI only: retire the fixed library bucket; never enumerate or touch other buckets. */
export async function retireLibraryStorage(
  accountId: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<"absent" | "deleted" | "scheduled"> {
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !apiToken.trim())
    throw new Error("Cloudflare account and API token are required");
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${LIBRARY_BUCKET_NAME}`;
  async function call(method: string, path = "", body?: unknown) {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
    } catch {
      // Do not expose fetch errors, which may contain request credentials.
      throw new Error("Library bucket request failed (network or timeout)");
    }
    const data = (await response.json().catch(() => null)) as ApiBody | null;
    if (data?.result?.name !== undefined && data.result.name !== LIBRARY_BUCKET_NAME)
      throw new Error("Unexpected library bucket");
    return { response, data };
  }
  function failed(response: Response, data: ApiBody | null): never {
    // Log only Cloudflare error codes/messages, never the response body or token.
    const details = Array.isArray(data?.errors)
      ? data.errors
          .map((error) => {
            const code = typeof error?.code === "number" ? String(error.code) : "unknown";
            const message = typeof error?.message === "string" ? error.message : "Unknown error";
            return `${code}: ${message
              .split(apiToken)
              .join("[redacted]")
              .replace(/[\r\n]/g, " ")}`;
          })
          .join("; ")
      : "";
    throw new Error(details || `Library bucket request failed: HTTP ${response.status}`);
  }
  const existing = await call("GET");
  if (existing.response.status === 404) return "absent";
  if (!existing.response.ok || existing.data?.success !== true)
    failed(existing.response, existing.data);
  if (existing.data?.result?.name !== LIBRARY_BUCKET_NAME)
    throw new Error("Unexpected library bucket");

  const deleted = await call("DELETE");
  if (deleted.response.status === 404) return "absent";
  if (deleted.response.ok && (deleted.data?.success === true || deleted.response.status === 204))
    return "deleted";
  // 10008 = BucketNotEmpty. Other failures (including permission errors) must not set rules.
  if (
    deleted.response.status !== 409 ||
    !Array.isArray(deleted.data?.errors) ||
    !deleted.data.errors.some((error) => error?.code === 10008)
  )
    failed(deleted.response, deleted.data);

  const scheduled = await call("PUT", "/lifecycle", libraryRetirementRules);
  if (!scheduled.response.ok || scheduled.data?.success !== true)
    failed(scheduled.response, scheduled.data);
  return "scheduled";
}
