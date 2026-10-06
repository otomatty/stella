/**
 * 学習フォルダー (06 §3 の `web-training`)。プログラム全体で 1 つにし、課題はその中の
 * `<講座>/<単元>/<課題>/` に置く (07 §4.4)。前の講座で作ったものを後の講座で使い直すため。
 *
 * 場所は拡張の globalState に覚える。ワークスペース設定 (`.vscode/settings.json`) には
 * 置かない — 開いたフォルダーの設定一つで課題の書き出し先を変えさせないため
 * (`stella.serverUrl` をユーザー設定に限ったのと同じ理由)。
 */

import { mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import * as vscode from "vscode";

export const TRAINING_ROOT_KEY = "stella.trainingRoot";
export const DEFAULT_TRAINING_FOLDER = "web-training";

type Memento = Pick<vscode.Memento, "get" | "update">;

async function identity(target: string) {
  try {
    const found = await stat(target, { bigint: true });
    // ファイル番号を返さないファイルシステムでは、同じかどうかを判断できない。
    return found.ino === 0n ? undefined : found;
  } catch {
    return undefined;
  }
}

/**
 * 同じ場所を指すパスか。両方あれば実体 (デバイスとファイル番号) で比べる — 大文字と小文字を
 * 区別しないボリューム (Windows・macOS の既定) も、区別するボリューム (macOS の
 * 大文字小文字を区別する APFS など) も、リンクも、ファイルシステムどおりに扱える。
 * どちらかが無ければ表記で比べ、Windows だけ大文字と小文字を区別しない (VS Code の fsPath は
 * ドライブ文字を小文字にするため)。
 */
export async function samePath(
  a: string,
  b: string,
  platform: NodeJS.Platform = process.platform,
): Promise<boolean> {
  const [left, right] = await Promise.all([identity(a), identity(b)]);
  if (left && right) return left.dev === right.dev && left.ino === right.ino;
  const normalize = (p: string) => {
    const resolved = path.resolve(p);
    return platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(a) === normalize(b);
}

/** 学習フォルダーに使えない場所なら理由を返す。ドライブの直下とホームフォルダーそのものは避ける。 */
export async function trainingRootProblem(
  candidate: string,
  home = homedir(),
): Promise<string | undefined> {
  if (!path.isAbsolute(candidate)) return "学習フォルダーは絶対パスで指定してください";
  const resolved = path.resolve(candidate);
  if (path.parse(resolved).root === resolved)
    return "ドライブの直下は学習フォルダーにできません。中に学習用のフォルダーを作って選んでください";
  if (await samePath(resolved, home))
    return "ホームフォルダーそのものではなく、その中の学習用のフォルダー (例: web-training) を選んでください";
  return undefined;
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

/** 覚えている学習フォルダー。消えていたり使えない場所だったりすれば undefined。 */
export async function rememberedTrainingRoot(state: Memento): Promise<string | undefined> {
  const value = state.get<unknown>(TRAINING_ROOT_KEY);
  if (typeof value !== "string" || (await trainingRootProblem(value))) return undefined;
  return (await isDirectory(value)) ? path.resolve(value) : undefined;
}

/**
 * 学習フォルダーを決める。覚えた場所があればそれを使い、無ければ (または ask なら)
 * 「ホームに web-training を作る」か「既存のフォルダーを選ぶ」かを尋ねて覚える。
 * 取り消したら undefined。
 */
export async function resolveTrainingRoot(
  state: Memento,
  options: { ask?: boolean } = {},
): Promise<string | undefined> {
  if (!options.ask) {
    const remembered = await rememberedTrainingRoot(state);
    if (remembered) return remembered;
  }
  const fallback = path.join(homedir(), DEFAULT_TRAINING_FOLDER);
  const create = {
    label: `ホームフォルダーに ${DEFAULT_TRAINING_FOLDER} を作る`,
    description: fallback,
    detail: "初めての方はこちら。すでにあれば、そのフォルダーを使います",
    action: "create" as const,
  };
  const pick = {
    label: "既存のフォルダーを選ぶ",
    detail: "前に作った学習フォルダーや、講師に指定された場所を使うとき",
    action: "pick" as const,
  };
  const choice = await vscode.window.showQuickPick([create, pick], {
    title: "学習フォルダーを決めてください",
    placeHolder:
      "すべての講座の課題をこのフォルダーの中に準備します (「STELLA: 学習フォルダーを選ぶ」で変えられます)",
    ignoreFocusOut: true,
  });
  if (!choice) return undefined;
  let chosen = fallback;
  if (choice.action === "pick") {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(homedir()),
      openLabel: "学習フォルダーにする",
      title: "学習フォルダーを選ぶ",
    });
    if (!picked?.[0]) return undefined;
    chosen = picked[0].fsPath;
  }
  const problem = await trainingRootProblem(chosen);
  if (problem) {
    void vscode.window.showErrorMessage(problem);
    return undefined;
  }
  if (choice.action === "create") await mkdir(chosen, { recursive: true });
  if (!(await isDirectory(chosen))) throw new Error(`フォルダーではありません: ${chosen}`);
  const resolved = path.resolve(chosen);
  await state.update(TRAINING_ROOT_KEY, resolved);
  return resolved;
}
