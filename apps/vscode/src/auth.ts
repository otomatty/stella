import * as vscode from "vscode";

const ACCESS_TOKEN_KEY = "stella.accessToken";
const LEGACY_ACCESS_TOKEN_KEY = "falcon.accessToken";
const didChangeAuth = new vscode.EventEmitter<void>();
const didChangeAuthSession = new vscode.EventEmitter<void>();

export const onDidChangeAuth = didChangeAuth.event;

/**
 * 接続の世代が進んだ直後に、同期的に知らせる。トークンを書き換える前 (await の前) に発火するので、
 * 前の受講者の表示 (課題パネルの解答例など) を、新しいトークンが読まれる前に消すのに使う。
 * カタログの読み直しのように新しいトークンが要る処理は、書き換えのあとの `onDidChangeAuth` を使う。
 */
export const onDidChangeAuthSession = didChangeAuthSession.event;

/**
 * 接続の世代。トークンを書き換える (接続・切断・別のウィンドウでの切り替え) たびに進める。
 * このウィンドウでの書き換えは、書き換えの前に同期的に進める。世代とそのときのトークンを組で
 * 扱う取得 (`apiRequest` の `session`) は、トークンを読んだあとで世代を確かめ、変わっていれば送らない。
 */
let session = 0;

export function authSession(): number {
  return session;
}

/** 接続の世代が変わったので、前の世代の処理をやめた。 */
export class AuthSessionChanged extends Error {
  constructor() {
    super("LMS への接続が変わったため、処理をやめました");
    this.name = "AuthSessionChanged";
  }
}

function advanceSession(): void {
  session += 1;
  didChangeAuthSession.fire();
}

export class AuthStore {
  /**
   * このウィンドウが知っている今のトークン (未接続は null、まだ読んでいなければ undefined)。
   * 読んだトークンと違えば、別のウィンドウで接続が切り替わったとみなす。
   */
  private known: string | null | undefined;
  /** このウィンドウでの書き換え (接続・切断) の途中か。途中で読んだ値は知っているものと比べない。 */
  private writing = 0;
  /** 進行中の書き換え。世代つきのトークンは、書き換えが終わってから読む。 */
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly secrets: vscode.SecretStorage) {}

  /** 今の接続の世代 (`authSession()` と同じ。API クライアントが auth.ts を読み込まずに使う)。 */
  currentSession(): number {
    return session;
  }

  async getToken(): Promise<string | null> {
    const current = await this.secrets.get(ACCESS_TOKEN_KEY);
    if (current !== undefined) return current;
    // 同じ拡張スコープに残った旧キーだけ移せる。拡張 ID の変更時は再接続が必要。
    const legacy = await this.secrets.get(LEGACY_ACCESS_TOKEN_KEY);
    if (legacy === undefined) return null;
    // 同じ受講者のトークンを新しいキーへ移すだけなので、接続の世代は進めない。
    if (this.known === undefined) this.known = legacy;
    try {
      await this.secrets.store(ACCESS_TOKEN_KEY, legacy);
      await this.secrets.delete(LEGACY_ACCESS_TOKEN_KEY);
    } catch {
      // 保存に失敗しても、読めた旧トークンでこの接続は続ける。
    }
    return legacy;
  }

  /**
   * 接続の世代 `expected` のトークン。読んだあとで世代を確かめ、変わっていれば (読んでいる間に
   * 接続・切断した、または別のウィンドウで切り替わっていた) `AuthSessionChanged` を投げる。
   * 呼び出し側は、このあと await を挟まずに送る (世代とトークンを不可分に扱う)。
   */
  async getTokenInSession(expected: number): Promise<string | null> {
    if (session !== expected) throw new AuthSessionChanged();
    // 書き換えの途中なら終わるのを待つ (新しい世代で、書き換える前のトークンを読まない)。
    await this.pending;
    if (session !== expected) throw new AuthSessionChanged();
    const token = await this.getToken();
    this.notice(token);
    if (session !== expected) throw new AuthSessionChanged();
    return token;
  }

  async setToken(token: string): Promise<void> {
    // 書き換えより前に世代を進める。書き換えの途中で始まった前の世代の処理が、新しいトークンで
    // 送られないようにするため。
    await this.rewrite(token, async () => {
      await this.secrets.store(ACCESS_TOKEN_KEY, token);
      await this.secrets.delete(LEGACY_ACCESS_TOKEN_KEY);
    });
  }

  async clear(): Promise<void> {
    await this.rewrite(null, async () => {
      await this.secrets.delete(ACCESS_TOKEN_KEY);
      await this.secrets.delete(LEGACY_ACCESS_TOKEN_KEY);
    });
  }

  /** 世代を同期的に進めてから書き換え、書き換えが終わったら知らせる。 */
  private async rewrite(token: string | null, write: () => Promise<void>): Promise<void> {
    this.known = token;
    advanceSession();
    this.writing += 1;
    const done = this.pending.then(write);
    this.pending = done.catch(() => undefined);
    try {
      await done;
    } finally {
      this.writing -= 1;
    }
    didChangeAuth.fire();
  }

  /**
   * 別のウィンドウでの接続・切断も、接続の切り替えとして扱う (SecretStorage は同じ VS Code の
   * ウィンドウで共有する)。このウィンドウが書いた値と同じなら何もしない。
   */
  watchExternalChanges(): vscode.Disposable {
    return this.secrets.onDidChange((event) => {
      if (event.key !== ACCESS_TOKEN_KEY) return;
      void this.secrets.get(ACCESS_TOKEN_KEY).then(
        (value) => this.notice(value ?? null),
        () => undefined,
      );
    });
  }

  /** 読んだトークンが知っているものと違えば、世代を進めて知らせる。 */
  private notice(token: string | null): void {
    if (this.writing > 0) return;
    if (this.known === undefined) {
      this.known = token;
      return;
    }
    if (token === this.known) return;
    this.known = token;
    advanceSession();
    didChangeAuth.fire();
  }
}

export function disposeAuthEvents(): void {
  didChangeAuth.dispose();
  didChangeAuthSession.dispose();
}
