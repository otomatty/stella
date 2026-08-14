import * as vscode from "vscode";
import type { AuthStore } from "./auth.js";

export class AuthExpiredError extends Error {
  readonly status = 401 as const;

  constructor(message = "認証の有効期限が切れました") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

let authStore: AuthStore | undefined;

export function initApi(store: AuthStore): void {
  authStore = store;
}

function requireAuthStore(): AuthStore {
  if (!authStore) {
    throw new Error("AuthStore is not initialized");
  }
  return authStore;
}

function serverUrl(): string {
  return vscode.workspace
    .getConfiguration("falcon")
    .get<string>("serverUrl", "http://127.0.0.1:8787")
    .replace(/\/+$/, "");
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

type ApiInit = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiRequest<T>(path: string, init: ApiInit = {}): Promise<T> {
  const auth = requireAuthStore();
  const url = `${serverUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const token = await auth.getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { body: rawBody, ...rest } = init;
  let body: BodyInit | undefined;
  if (typeof rawBody === "string") {
    body = rawBody;
  } else if (rawBody !== undefined && rawBody !== null) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(rawBody);
  }

  const res = await fetch(url, { ...rest, headers, body });
  const data: unknown = await res.json().catch(() => null);

  if (res.status === 401) {
    await auth.clear();
    throw new AuthExpiredError(errorMessage(data, "認証の有効期限が切れました"));
  }

  if (!res.ok) {
    throw new Error(errorMessage(data, `API ${res.status}`));
  }

  return data as T;
}
