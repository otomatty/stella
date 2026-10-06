/**
 * 教材の OS 別ブロック (07 §11) を、どの OS のタブで開くか。
 *
 * 既定はプロフィールの設定 (`profiles.os_preference`)、無ければ端末から推定、それも
 * できなければ Windows (主教材。06 §3)。タブを押して別の OS を読んでいる間は、その OS を
 * ページをまたいで覚えておく (同じ画面のタブがそろって切り替わる)。設定は変えない —
 * 自分の OS 以外を覗いただけで既定が変わると、次に開いた教材で迷うため。
 */

import { DEFAULT_OS, type OsName } from "@stella/shared/markdown/os-blocks";

import { apiFetch } from "./api-client";
import type { Profile } from "./auth";

export interface NavigatorLike {
  userAgent?: string;
  maxTouchPoints?: number;
  userAgentData?: { platform?: string };
}

/** 端末の OS を推定する。Windows・macOS 以外 (Linux・スマートフォンなど) は null。 */
export function detectOs(nav: NavigatorLike | undefined): OsName | null {
  if (!nav) return null;
  const hint = nav.userAgentData?.platform;
  if (hint) {
    if (/^windows$/i.test(hint)) return "windows";
    if (/^macos$/i.test(hint)) return "macos";
    return null;
  }
  const ua = nav.userAgent ?? "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return "windows";
  // iPad の Safari はデスクトップ版の UA (Macintosh) を名乗るので、タッチ点の数で除く。
  if (/Macintosh|Mac OS X/i.test(ua)) return (nav.maxTouchPoints ?? 0) > 1 ? null : "macos";
  return null;
}

export type OsSource = "profile" | "device" | "default";

/** 既定に開く OS と、その出どころ (画面の「あなたの OS」に添える)。 */
export function resolvePreferredOs(
  saved: OsName | null | undefined,
  detected: OsName | null,
): { os: OsName; source: OsSource } {
  if (saved) return { os: saved, source: "profile" };
  if (detected) return { os: detected, source: "device" };
  return { os: DEFAULT_OS, source: "default" };
}

export function detectBrowserOs(): OsName | null {
  return typeof navigator === "undefined" ? null : detectOs(navigator as NavigatorLike);
}

// --- タブで選んでいる OS (設定とは別。ページをまたいで同じタブを開く)

let viewOs: OsName | null = null;
const listeners = new Set<() => void>();

export function getViewOs(): OsName | null {
  return viewOs;
}

export function setViewOs(os: OsName | null): void {
  if (viewOs === os) return;
  viewOs = os;
  for (const listener of listeners) listener();
}

export function subscribeViewOs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** プロフィールの OS 設定を保存する。null は「端末から推定する」。 */
export async function updateMyOsPreference(os: OsName | null): Promise<Profile> {
  const { profile } = await apiFetch<{ profile: Profile }>("/api/me", {
    method: "POST",
    body: { os_preference: os },
  });
  if (!profile) throw new Error("OS の設定を保存できませんでした");
  return profile;
}
