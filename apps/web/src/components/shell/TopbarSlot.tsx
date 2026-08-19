import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Topbar 内の差し込み口の DOM id。 Topbar が空の入れ物を描き、 各画面がここへ portal する。 */
export const TOPBAR_SLOT_ID = "falcon-topbar-slot";

/**
 * Topbar のメニューボタン隣へ、 画面固有のナビゲーションを差し込む portal。
 *
 * レッスンの目次のように「常に開けるが常設すると本文の表示領域を削る」ものを、
 * 既に画面上部に固定されている Topbar へ寄せるための口。 Topbar を描くのは
 * AppShell なので、 入れ物が DOM に載ってから (mount 後の 1 描画ぶん遅れて) 描く。
 */
export const TopbarSlot = ({ children }: { children: ReactNode }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById(TOPBAR_SLOT_ID));
  }, []);

  return host ? createPortal(children, host) : null;
};
