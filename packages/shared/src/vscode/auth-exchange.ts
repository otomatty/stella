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
  });

  const data: unknown = await res.json().catch(() => null);
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const errorMessage = typeof record?.error === "string" ? record.error : undefined;

  if (!res.ok) {
    throw new Error(errorMessage ?? `接続コードの交換に失敗しました (${res.status})`);
  }

  if (typeof record?.access_token !== "string" || record.access_token === "") {
    throw new Error("接続コードの交換に失敗しました");
  }

  return record.access_token;
}
