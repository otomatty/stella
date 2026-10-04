import * as vscode from "vscode";

const ACCESS_TOKEN_KEY = "stella.accessToken";
const LEGACY_ACCESS_TOKEN_KEY = "falcon.accessToken";
const didChangeAuth = new vscode.EventEmitter<void>();

export const onDidChangeAuth = didChangeAuth.event;

export class AuthStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getToken(): Promise<string | null> {
    const current = await this.secrets.get(ACCESS_TOKEN_KEY);
    if (current !== undefined) return current;
    // 同じ拡張スコープに残った旧キーだけ移せる。拡張 ID の変更時は再接続が必要。
    const legacy = await this.secrets.get(LEGACY_ACCESS_TOKEN_KEY);
    if (legacy === undefined) return null;
    try {
      await this.secrets.store(ACCESS_TOKEN_KEY, legacy);
      await this.secrets.delete(LEGACY_ACCESS_TOKEN_KEY);
    } catch {
      // 保存に失敗しても、読めた旧トークンでこの接続は続ける。
    }
    return legacy;
  }

  async setToken(token: string): Promise<void> {
    await this.secrets.store(ACCESS_TOKEN_KEY, token);
    await this.secrets.delete(LEGACY_ACCESS_TOKEN_KEY);
    didChangeAuth.fire();
  }

  async clear(): Promise<void> {
    await this.secrets.delete(ACCESS_TOKEN_KEY);
    await this.secrets.delete(LEGACY_ACCESS_TOKEN_KEY);
    didChangeAuth.fire();
  }
}

export function disposeAuthEvents(): void {
  didChangeAuth.dispose();
}
