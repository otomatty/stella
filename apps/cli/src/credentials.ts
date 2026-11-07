/**
 * CLI の接続情報。トークンは `~/.stella/credentials.json` にだけ置き、画面には出さない。
 */

import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const PRODUCTION_SERVER_URL = "https://stella.saedgewell.workers.dev";

const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1"]);

export interface Credentials {
  serverUrl: string;
  accessToken: string;
}

export function credentialsPath(home = homedir()): string {
  return path.join(home, ".stella", "credentials.json");
}

/** `https:` は許可する。それ以外は localhost と 127.0.0.1 の `http:` だけ。 */
export function resolveServerUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.STELLA_SERVER_URL ?? PRODUCTION_SERVER_URL).trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("STELLA_SERVER_URL が URL として読めません");
  }
  const localHttp = url.protocol === "http:" && LOCAL_HTTP_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("接続先は https か、localhost と 127.0.0.1 の http だけを使えます");
  }
  return url.origin;
}

export async function saveCredentials(creds: Credentials, home = homedir()): Promise<void> {
  const file = credentialsPath(home);
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const body = `${JSON.stringify({ serverUrl: creds.serverUrl, accessToken: creds.accessToken })}\n`;
  await writeFile(file, body, { mode: 0o600 });
  await chmod(file, 0o600);
}

export async function readCredentials(home = homedir()): Promise<Credentials | undefined> {
  try {
    const raw: unknown = JSON.parse(await readFile(credentialsPath(home), "utf8"));
    if (!raw || typeof raw !== "object") return undefined;
    const row = raw as { serverUrl?: unknown; accessToken?: unknown };
    if (typeof row.serverUrl !== "string" || typeof row.accessToken !== "string") return undefined;
    if (row.serverUrl === "" || row.accessToken === "") return undefined;
    return { serverUrl: row.serverUrl, accessToken: row.accessToken };
  } catch {
    return undefined;
  }
}

export async function clearCredentials(home = homedir()): Promise<void> {
  await rm(credentialsPath(home), { force: true });
}

/** 保存したときと同じ接続先にだけトークンを返す。違う接続先には渡さない。 */
export function tokenForServer(creds: Credentials | undefined, serverUrl: string): string | null {
  if (!creds || creds.serverUrl !== serverUrl) return null;
  return creds.accessToken;
}
