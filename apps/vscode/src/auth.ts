import * as vscode from "vscode";

const ACCESS_TOKEN_KEY = "falcon.accessToken";

const didChangeAuth = new vscode.EventEmitter<void>();

/** Task 5 can subscribe to refresh the lesson tree after connect / disconnect. */
export const onDidChangeAuth = didChangeAuth.event;

export class AuthStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getToken(): Promise<string | null> {
    return (await this.secrets.get(ACCESS_TOKEN_KEY)) ?? null;
  }

  async setToken(token: string): Promise<void> {
    await this.secrets.store(ACCESS_TOKEN_KEY, token);
    didChangeAuth.fire();
  }

  async clear(): Promise<void> {
    await this.secrets.delete(ACCESS_TOKEN_KEY);
    didChangeAuth.fire();
  }
}

export function disposeAuthEvents(): void {
  didChangeAuth.dispose();
}
