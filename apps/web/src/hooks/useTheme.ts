/**
 * テーマ (ライト / ダーク) の状態管理 Hook。
 *
 * - 真の値: `<html>` 要素の `dark` クラス
 * - ユーザー選好: localStorage の `theme` キー (`"light"` | `"dark"` | 未設定)
 * - 未設定時は OS の `prefers-color-scheme` に追従する。明示選択後は固定。
 *
 * 初期 class 付与は `index.html` のインラインスクリプトで先行実行される。
 * このフックは React マウント時点の class 状態を初期値として取り込む。
 */

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";

// `index.html` のインラインスクリプト内のキー名と一致させること。
export const THEME_STORAGE_KEY = "theme";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** `index.html` のインラインスクリプトと同じ値。 モバイルのブラウザ chrome の色。 */
const THEME_COLORS: Record<Theme, string> = { light: "#FFFFFF", dark: "#0D0D10" };

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  // OS 設定と違うテーマを明示選択した時もブラウザ chrome を合わせる。
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

export function themeTransitionRadius(
  { x, y }: ThemeTransitionOrigin,
  width: number,
  height: number,
): number {
  const farthestX = Math.max(Math.abs(x), Math.abs(width - x));
  const farthestY = Math.max(Math.abs(y), Math.abs(height - y));
  return Math.hypot(farthestX, farthestY);
}

interface ThemeApi {
  theme: Theme;
  toggleTheme: (origin?: ThemeTransitionOrigin) => void;
}

export function useTheme(): ThemeApi {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  const toggleTheme = useCallback((origin?: ThemeTransitionOrigin) => {
    const updateTheme = () => {
      // 連打しても、切り替える時点の DOM から次のテーマを決める。
      const next: Theme = readInitialTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      // 明示選択時だけ保存する (OS 設定に追従した変更は保存しない)。
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (_) {
        // private モード等で書けない場合は黙って諦める
      }
      setTheme(next);
    };

    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      updateTheme();
      return;
    }

    const { innerWidth, innerHeight } = window;
    const center = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
    const radius = themeTransitionRadius(center, innerWidth, innerHeight);
    const position = `${center.x}px ${center.y}px`;
    const transition = document.startViewTransition(() => {
      // 新しいテーマのスナップショットにアイコンの更新も含める。
      flushSync(updateTheme);
    });
    // 遷移が中断されても更新コールバックは実行される。
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${position})`, `circle(${radius}px at ${position})`] },
          { duration: 400, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => undefined);
    transition.updateCallbackDone.catch(() => undefined);
    transition.finished.catch(() => undefined);
  }, []);

  // theme state を DOM (`<html class="dark">`) に同期
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // DOM class を直接更新する実装にも追従する。
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(readInitialTheme()));

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // ユーザーが明示選択していない (= localStorage 未設定) 間は OS 設定に追従
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
      } catch (_) {
        // localStorage が読めない環境では OS 設定に追従する
      }
      if (stored === "light" || stored === "dark") {
        return;
      }
      setTheme(event.matches ? "dark" : "light");
    };
    // Safari 13 / iOS 13 では addEventListener が無く addListener しか持たない。
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  return { theme, toggleTheme };
}
