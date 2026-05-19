/**
 * 旧スキーマの localStorage を削除した直後に 1 度だけ表示する通知。
 *
 * `progress-store.ts` の `consumeResetNotice()` で sessionStorage フラグを
 * 取り出し、 該当するセッションに限り画面右下にトーストを出す。
 * 「閉じる」 を押すか、 数秒経過で自動的に消える。
 */

import { useEffect, useState } from "react";

import { consumeResetNotice } from "../lib/progress-store.js";

const AUTO_DISMISS_MS = 8000;

// useState の initializer は StrictMode dev で 2 回評価されるため、
// `consumeResetNotice` を直接そこで呼ぶと 2 回目で flag が空になり通知が
// 表示されない。 module スコープで一度だけ消費し、 結果をキャッシュする。
let cachedShouldShow: boolean | null = null;
function shouldShowResetNotice(): boolean {
  if (cachedShouldShow === null) {
    cachedShouldShow = consumeResetNotice();
  }
  return cachedShouldShow;
}

export function ResetNoticeToast() {
  const [visible, setVisible] = useState<boolean>(shouldShowResetNotice);

  useEffect(() => {
    if (!visible) {return;}
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) {return null;}

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex max-w-[360px] items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-[var(--shadow-2)]"
    >
      <span className="mt-0.5 text-[18px]" aria-hidden>
        ℹ️
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-jp text-[13px] font-bold text-foreground">
          進捗をリセットしました
        </div>
        <p className="m-0 mt-1 text-[12px] leading-[1.6] text-muted-foreground">
          スキーマ更新のため、 旧バージョンで保存されていた進捗データを破棄しました。
          再び問題をクリアすると新しいステージ画面に進捗が反映されます。
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="通知を閉じる"
      >
        ×
      </button>
    </div>
  );
}
