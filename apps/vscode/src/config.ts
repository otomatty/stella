import * as vscode from "vscode";

type UrlKey = "serverUrl" | "webUrl";

/**
 * 本番の STELLA。Web の Worker が `/api/*` を API へ中継するので、API も Web と同じオリジン。
 * Marketplace から入れた拡張は設定なしでここへつなぐ (受講者に URL を設定させない)。
 */
export const PRODUCTION_ORIGIN = "https://stella.saedgewell.workers.dev";

/** 開発 (F5 の Extension Development Host)・テストの既定。`bun run dev:api` / `bun run dev`。 */
const LOCAL_DEFAULTS: Record<UrlKey, string> = {
  serverUrl: "http://127.0.0.1:8787",
  webUrl: "http://127.0.0.1:5173",
};

/** `vscode.ExtensionMode.Production` (列挙を読まずに比べる。テストの vscode の差し替えに無いため)。 */
const PRODUCTION_MODE = 1;

let localDefaults = false;

/**
 * 拡張の起動の仕方で既定の接続先を決める (activate で 1 回呼ぶ)。入れた拡張は本番、
 * F5 の開発ホストとテストはローカル。ユーザー設定で明示した値はどちらでも優先する。
 */
export function setUrlDefaultsForMode(mode: number | undefined): void {
  localDefaults = mode !== PRODUCTION_MODE;
}

/** 設定が無いときの接続先。 */
export function defaultUrl(key: UrlKey): string {
  return localDefaults ? LOCAL_DEFAULTS[key] : PRODUCTION_ORIGIN;
}

/**
 * ユーザー設定の値だけを読む。ワークスペース設定 (`.vscode/settings.json`) は読まない。
 * 学習用のプロジェクトを開いただけで API の宛先が変わり、ログインのトークン (JWT) が
 * 別のサーバーへ送られるのを防ぐ。package.json でも scope を application にしてある。
 */
function userValue(config: vscode.WorkspaceConfiguration, key: UrlKey): string | undefined {
  return config.inspect<string>(key)?.globalValue;
}

/** 旧設定は読み取り互換のみ。新名で明示した設定を優先する。 */
export function stellaConfig(key: UrlKey, fallback: string): string {
  const current = vscode.workspace.getConfiguration("stella");
  const legacy = vscode.workspace.getConfiguration("falcon");
  return (userValue(current, key) ?? userValue(legacy, key) ?? fallback).replace(/\/+$/, "");
}

/** API・Web の接続先 (ユーザー設定 → 旧設定 → 起動の仕方による既定)。 */
export function stellaUrl(key: UrlKey): string {
  return stellaConfig(key, defaultUrl(key));
}
