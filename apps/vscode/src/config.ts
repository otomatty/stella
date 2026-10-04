import * as vscode from "vscode";

type UrlKey = "serverUrl" | "webUrl";

function explicitValue(config: vscode.WorkspaceConfiguration, key: UrlKey): string | undefined {
  const inspected = config.inspect<string>(key);
  return inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? inspected?.globalValue;
}

/** 旧設定は読み取り互換のみ。新名で明示した設定を優先する。 */
export function stellaConfig(key: UrlKey, fallback: string): string {
  const current = vscode.workspace.getConfiguration("stella");
  const legacy = vscode.workspace.getConfiguration("falcon");
  return (
    explicitValue(current, key) ??
    explicitValue(legacy, key) ??
    current.get<string>(key, fallback)
  ).replace(/\/+$/, "");
}
