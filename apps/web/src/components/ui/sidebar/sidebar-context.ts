/**
 * Sidebar の共有状態 (context) と寸法定数。
 *
 * shadcn/ui の Sidebar を参考にした自前実装 (依存追加なし)。
 * 状態は `SidebarProvider` が持ち、 `Sidebar` / `SidebarTrigger` /
 * `SidebarMenuButton` などの部品がこの context 越しに同じ開閉状態を見る。
 *
 * デスクトップ (`open`) とモバイル (`openMobile`) で状態を分けているのは、
 * モバイルではオーバーレイのドロワー、 デスクトップでは常設カラムと、
 * 開いている意味が違うため。 画面幅を跨いでも互いの状態を壊さない。
 */

import { createContext, useContext } from "react";

/** デスクトップで展開しているときの幅。 旧サイドバー (236px) を踏襲する。 */
export const SIDEBAR_WIDTH = "236px";
/** `collapsible="icon"` で畳んだときの幅 (アイコンだけが残る)。 */
export const SIDEBAR_WIDTH_ICON = "56px";
/** モバイル (ドロワー) の幅。 旧ドロワーと同じ値にしてある。 */
export const SIDEBAR_WIDTH_MOBILE = "min(84vw, 236px)";
/** 開閉のキーボードショートカット (⌘B / Ctrl+B)。 */
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/** 展開中か、 畳んでいるか。 `data-state` としても DOM に出る。 */
export type SidebarState = "expanded" | "collapsed";

export interface SidebarContextValue {
  /** `open` から導かれる表示状態。 スタイルの分岐用。 */
  state: SidebarState;
  /** デスクトップの開閉。 */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** モバイル (ドロワー) の開閉。 */
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  /** ビューポートが `lg` 未満か。 true ならドロワーとして描画する。 */
  isMobile: boolean;
  /** 現在のビューポートに合う方の開閉をトグルする。 */
  toggleSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar は <SidebarProvider> の内側で呼んでください");
  }
  return context;
}
