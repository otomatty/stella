import { useCallback, useSyncExternalStore } from "react";

/**
 * CSS メディアクエリの現在値を購読する。 SSR / 非ブラウザ環境では `false` を返す。
 *
 * ブレークポイントごとの薄いラッパー (`useIsNarrowViewport` / `useIsMobileViewport`) の土台。
 * リサイズだけでなく、 VS Code 拡張のパネル幅変更のように
 * 「マウント中にビューポートを跨ぐ」ケースにも追従する。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
