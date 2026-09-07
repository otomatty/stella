/**
 * CORS オリジン判定。 Workers / Preview (`*.preview.example.com` 等)
 * のワイルドカードに対応。
 *
 * パターン例:
 * - 完全一致: `https://app.example.com`
 * - サブドメインのみ: `*.example.com` / `https://*.example.com`（apex `example.com` は含まない）
 * - スキームなし (`*.example.com`) は HTTP / HTTPS 両方にマッチ。HTTPS のみなら `https://*` を使う
 */

interface OriginPattern {
  exact?: string;
  scheme?: "http" | "https";
  hostSuffix?: string;
}

function parseOriginPattern(pattern: string): OriginPattern {
  const schemeMatch = pattern.match(/^(https?):\/\/(.+)$/);
  if (schemeMatch) {
    const scheme = schemeMatch[1] as "http" | "https";
    const hostPart = schemeMatch[2];
    if (hostPart.startsWith("*.")) {
      return { scheme, hostSuffix: hostPart.slice(1) };
    }
    return { exact: pattern };
  }

  if (pattern.startsWith("*.")) {
    return { hostSuffix: pattern.slice(1) };
  }

  return { exact: pattern };
}

function matchesHostSuffix(hostname: string, suffix: string): boolean {
  // `*.example.com` はサブドメインのみ。apex (`example.com`) は許可しない。
  return hostname.endsWith(suffix) && hostname.length > suffix.length;
}

export function isAllowedOrigin(origin: string, allowedOrigins: string): boolean {
  const patterns = allowedOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const pattern of patterns) {
    const parsed = parseOriginPattern(pattern);

    if (parsed.exact && parsed.exact === origin) {
      return true;
    }

    if (!parsed.hostSuffix) {
      continue;
    }

    try {
      const { hostname, protocol } = new URL(origin);
      if (protocol !== "http:" && protocol !== "https:") {
        continue;
      }
      const scheme = protocol === "https:" ? "https" : "http";
      if (parsed.scheme && parsed.scheme !== scheme) {
        continue;
      }
      if (matchesHostSuffix(hostname, parsed.hostSuffix)) {
        return true;
      }
    } catch {
      // 不正な ALLOWED_ORIGINS エントリは無視する
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
