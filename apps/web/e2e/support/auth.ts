import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import type { Page } from "playwright/test";

type SeedProfile = "seed-learner" | "seed-learner2" | "seed-admin";

const fixedTime = new Date("2026-11-19T10:00:00+09:00");
const devVars = new URL("../../../api/.dev.vars", import.meta.url);

function mintToken(profileId: SeedProfile): string {
  const secret = parseEnv(readFileSync(devVars, "utf8")).AUTH_JWT_SECRET;
  if (!secret) throw new Error("apps/api/.dev.vars に AUTH_JWT_SECRET を設定してください");

  // core-loop-smoke と同じ開発用 HS256 JWT。実時刻の API と固定時刻のブラウザーで使う。
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      sub: profileId,
      email: `${profileId}@example.local`,
      iss: "stella-api",
      aud: "stella-web",
      iat: issuedAt,
      exp: Math.max(issuedAt, fixedTime.getTime() / 1000) + 3600,
    }),
  ).toString("base64url");
  const unsignedToken = `${header}.${claims}`;
  const signature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");
  return `${unsignedToken}.${signature}`;
}

export async function signInAs(page: Page, profileId: SeedProfile): Promise<void> {
  await page.clock.setFixedTime(fixedTime);
  await page.addInitScript((token) => {
    if (window.location.origin === "http://127.0.0.1:4173") {
      window.localStorage.setItem("stella_auth_token_v1", token);
    }
  }, mintToken(profileId));
}
