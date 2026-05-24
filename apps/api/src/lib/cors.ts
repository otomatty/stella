/**
 * CORS オリジン判定。 Vercel Preview (`*.vercel.app`) 等のワイルドカードに対応。
 */

export function isAllowedOrigin(origin: string, allowedOrigins: string): boolean {
  const patterns = allowedOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const pattern of patterns) {
    if (pattern === origin) {
      return true;
    }
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1);
      try {
        const { hostname, protocol } = new URL(origin);
        if (protocol !== "http:" && protocol !== "https:") {
          continue;
        }
        if (hostname === suffix.slice(1) || hostname.endsWith(suffix)) {
          return true;
        }
      } catch {
        continue;
      }
    }
  }

  return false;
}

export function resolveCorsOrigin(
  requestOrigin: string | undefined,
  allowedOrigins: string,
): string | null {
  if (!requestOrigin) {
    return null;
  }
  return isAllowedOrigin(requestOrigin, allowedOrigins) ? requestOrigin : null;
}
