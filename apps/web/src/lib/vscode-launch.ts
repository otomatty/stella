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
 * 遅れて離れたら (確認に答えるのが遅かった) 案内を消す。
 */
function watchLaunch(): void {
  let toastId: string | number | undefined;
  const cleanup = () => {
    window.clearTimeout(hint);
    window.clearTimeout(stop);
    window.removeEventListener("blur", left);
    document.removeEventListener("visibilitychange", onVisibility);
  };
  const left = () => {
    cleanup();
    if (toastId !== undefined) toast.dismiss(toastId);
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") left();
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
