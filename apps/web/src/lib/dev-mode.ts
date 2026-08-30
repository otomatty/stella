/**
 * 開発者モード (スキルツリーの島を全表示し、霧の星の名前をぼかさない)。
 *
 * サーバの `DEV_MODE` が立っているときだけ効く。ヘッダを付けても本番は無視する。
 * 未保存はオン — ローカルで `.dev.vars` に `DEV_MODE=1` を書いた人は、以前は
 * 常時表示だったので、FAB を足しても既定は同じ見える側に倒す。
 */

export const DEV_MODE_HEADER = "X-Falcon-Dev-Mode";
export const DEV_MODE_STORAGE_KEY = "falcon_dev_mode_v1";

/** localStorage の生の値をオン/オフにする。未保存はオン。 */
export function parseDevModeStored(raw: string | null): boolean {
  if (raw === null) return true;
  return raw !== "0" && raw !== "false";
}

export function devModeHeaderValue(enabled: boolean): string {
  return enabled ? "1" : "0";
}

function readStored(): boolean {
  try {
    return parseDevModeStored(localStorage.getItem(DEV_MODE_STORAGE_KEY));
  } catch {
    return true;
  }
}

let enabled = readStored();
const listeners = new Set<(on: boolean) => void>();

export function isDevModeEnabled(): boolean {
  return enabled;
}

export function setDevModeEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(DEV_MODE_STORAGE_KEY, on ? "1" : "0");
  } catch {
    // プライベートモードなどで書けなくても、このタブのメモリ上の値は残す。
  }
  for (const listener of listeners) listener(on);
}

export function subscribeDevMode(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
