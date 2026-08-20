/**
 * 動画の再生終了後に次のレッスンへ自動で進むかどうかの設定。
 *
 * 端末ごとの見え方の好みなので localStorage に置く (サーバ同期はしない)。
 * 既定は on。 オフにすると再生終了時のオーバーレイはボタンだけになり、
 * カウントダウンによる自動遷移は行わない。
 */

import { useCallback, useState } from "react";

const STORAGE_KEY = "lms_autoplay_next_v1";

export function readAutoplayNext(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return true;
  try {
    // 未設定 (null) は既定の on。 明示的に "0" と書かれたときだけ off。
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeAutoplayNext(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // QuotaExceeded など。 今回の表示だけ設定に従い、 保存は諦める。
  }
}

/** 設定値と、 保存を伴う更新関数。 */
export function useAutoplayNext(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(readAutoplayNext);
  const update = useCallback((next: boolean) => {
    setEnabled(next);
    writeAutoplayNext(next);
  }, []);
  return [enabled, update];
}
