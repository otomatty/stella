import * as vscode from "vscode";

type UrlKey = "serverUrl" | "webUrl";

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
