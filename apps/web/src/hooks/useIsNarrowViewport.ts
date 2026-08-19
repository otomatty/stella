import { useMediaQuery } from "./useMediaQuery";

/**
 * Tailwind の `lg` 未満かどうか。 サイドバー / 目次をオーバーレイ扱いに切り替える境界。
 */
const QUERY = "(max-width: 1023px)";

export function useIsNarrowViewport(): boolean {
  return useMediaQuery(QUERY);
}
