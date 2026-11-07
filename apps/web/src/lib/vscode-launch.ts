/**
 * VS Code で課題・レッスンを開く (接続コード付きのディープリンク)。
 *
 * 接続専用ページは持たない。押した時にワンタイム接続コードを発行し、ディープリンクに載せて
 * 渡すので、拡張が未接続でも 1 クリックで VS Code が起動して接続 → 課題の準備 → 課題文の
 * 表示まで進む。コード発行に失敗しても (未ログイン等) ディープリンクだけは開き、接続済みの
 * 拡張ならそのまま動く。
 *
 * 拡張機能が入っていなければ、VS Code がディープリンクを受けたときに Marketplace からの
 * インストールを尋ねる (拡張 `saedgewell.stella-lms` を Marketplace で配る前提。手動の VSIX は使わない)。
 * VS Code そのものが無いとブラウザーは何もしないので、押してから数秒たってもブラウザーから
 * 離れなければ、VS Code の入手を案内する。
 */

import { buildVscodeLessonUri, buildVscodeTaskUri } from "@stella/shared/vscode/uris";
import { toast } from "sonner";

import { apiFetch } from "./api-client";

/** VS Code の入手先 (公式)。 */
export const VSCODE_DOWNLOAD_URL = "https://code.visualstudio.com/download";

/** VS Code が開いたかを待つ時間。ブラウザーの「開きますか」の確認に答える時間を見込む。 */
const LAUNCH_GRACE_MS = 4_000;
/** 開いたかの見張りをやめるまで (遅れて開いたら案内を消すため、案内のあとも少し見る)。 */
const WATCH_MS = 30_000;
const HANDOFF_HINT_KEY = "stella_vscode_handoff_hint_v1";

/** 壊れた保存値は未表示として扱う。3 回表示したら案内を終える。 */
export function nextHandoffHintCount(stored: string | null): number | undefined {
  const parsed = Number(stored);
  const count = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  return count < 3 ? count + 1 : undefined;
}

function showHandoffHint(): void {
  let next: number | undefined = 1;
  try {
    next = nextHandoffHintCount(localStorage.getItem(HANDOFF_HINT_KEY));
  } catch {
    // 保存できない環境でも案内は出す。
  }
  if (next === undefined) return;
  toast("VS Code で課題を開きました", {
    description:
      "VS Code の右側の課題文のパネルにある『進め方』を見てください。課題文が出ないときは、次を確かめます: 拡張機能のインストールを尋ねられたら、発行元が saedgewell の STELLA を入れる / 初めてのときは学習フォルダーを選ぶ / 『信頼しますか』と聞かれたら、自分の学習フォルダーなら信頼する",
    duration: 15_000,
    cancel: { label: "閉じる", onClick: () => undefined },
  });
  try {
    localStorage.setItem(HANDOFF_HINT_KEY, String(next));
  } catch {
    // 端末に回数を残せなければ、次回も表示してよい。
  }
}

export type VscodeTarget = { taskId: string } | { stageId: string; lessonId: string };

async function issueLinkCode(): Promise<string | undefined> {
  try {
    const { code } = await apiFetch<{ code: string; expires_at: string }>("/api/auth/vscode-link", {
      method: "POST",
    });
    return code;
  } catch {
    return undefined;
  }
}

/**
 * ブラウザーから離れた (VS Code が前面に来た) かを見張り、離れなければ VS Code の入手を案内する。
 * 遅れて離れたら入手の案内を消し、時間内に戻った最初の 1 回だけ進め方を案内する。
 */
function watchLaunch(): void {
  let toastId: string | number | undefined;
  let hasLeft = false;
  const cleanup = () => {
    window.clearTimeout(hint);
    window.clearTimeout(stop);
    window.removeEventListener("blur", left);
    window.removeEventListener("focus", returned);
    document.removeEventListener("visibilitychange", onVisibility);
  };
  const left = () => {
    hasLeft = true;
    window.clearTimeout(hint);
    if (toastId !== undefined) toast.dismiss(toastId);
  };
  const returned = () => {
    if (!hasLeft || document.visibilityState !== "visible") return;
    cleanup();
    showHandoffHint();
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") left();
    else if (document.visibilityState === "visible") returned();
  };
  const hint = window.setTimeout(() => {
    toastId = toast("VS Code が開きませんでしたか？", {
      description:
        "VS Code をインストールしてから、もう一度押してください。ブラウザーが「開きますか」と尋ねていれば許可してください。STELLA の拡張機能が入っていなければ、VS Code が開いたときにインストールを尋ねます。",
      duration: 20_000,
      action: {
        label: "VS Code を入手",
        onClick: () => {
          window.open(VSCODE_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
        },
      },
    });
  }, LAUNCH_GRACE_MS);
  const stop = window.setTimeout(cleanup, WATCH_MS);
  window.addEventListener("blur", left);
  window.addEventListener("focus", returned);
  document.addEventListener("visibilitychange", onVisibility);
}

/** 接続コードを発行して VS Code で開く。 */
export async function openInVscode(target: VscodeTarget): Promise<void> {
  const code = await issueLinkCode();
  const uri =
    "taskId" in target
      ? buildVscodeTaskUri(target.taskId, code)
      : buildVscodeLessonUri(target.stageId, target.lessonId, code);
  watchLaunch();
  location.assign(uri);
}
