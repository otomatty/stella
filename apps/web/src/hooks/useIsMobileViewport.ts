import { useMediaQuery } from "./useMediaQuery";

/**
 * Tailwind の `sm` 未満 (= スマートフォン幅) かどうか。
 * 右下に固定するポップオーバー的な UI を Drawer (ボトムシート) に差し替える境界。
 */
const QUERY = "(max-width: 639px)";

export function useIsMobileViewport(): boolean {
  return useMediaQuery(QUERY);
}
