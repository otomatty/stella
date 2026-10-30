import { type DeviceNavigator, isHandheld } from "@/lib/device";

/**
 * スマートフォン・タブレットか (`lib/device.ts`)。UA は開いている間に変わらないので、
 * 画面幅のフック (`useIsMobileViewport` など) と違って購読しない。
 */
const HANDHELD = typeof navigator !== "undefined" && isHandheld(navigator as DeviceNavigator);

export function useIsHandheld(): boolean {
  return HANDHELD;
}
