import { useSyncExternalStore } from 'react';

/**
 * Tailwind の `lg` 未満かどうか。 サイドバー / 目次をオーバーレイ扱いに切り替える境界で、
 * VSCode 拡張のパネル幅変更のように「マウント中にビューポートを跨ぐ」ケースにも追従する。
 */
const QUERY = '(max-width: 1023px)';

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useIsNarrowViewport(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
