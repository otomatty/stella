/**
 * 開発者モード (スキルツリーの島を全表示し、視界の段を素通しで描く)。
 *
 * サーバの `DEV_MODE` が立っているときだけ効く。ヘッダを付けても本番は無視する。
 *
 * **未保存はオフ。** 以前はオン (ローカルで `.dev.vars` に `DEV_MODE=1` を書いた人の
 * 既定を、FAB を足す前の常時表示に合わせていた) だったが、本番の新規セッションでも
 * オンになり、霧の星の名前がぼかされないまま描かれていた (Issue #271)。FAB は
 * `dev_mode_available` が偽だと出ないので、受講者に戻す手段も無かった。
 *
 * これは 2 段の防御の外側。**ぼかしを外してよいかの本線はサーバの応答**
 * (`skill_map.dev_mode`) で、この値はそれと AND を取る (`SkillTreePage`)。
 */

export const DEV_MODE_HEADER = "X-Falcon-Dev-Mode";

export const DEV_MODE_STORAGE_KEY = "falcon_dev_mode_v1";

/** localStorage の生の値をオン/オフにする。未保存はオフ (明示的に FAB で入れる)。 */
export function parseDevModeStored(raw: string | null): boolean {
  if (raw === null) return false;
  return raw !== "0" && raw !== "false";
}

export function devModeHeaderValue(enabled: boolean): string {
  return enabled ? "1" : "0";
}

/**
 * 実際に開発者表示で描いてよいか = **ローカルの設定 AND サーバが確認した開発モード**。
 *
 * サーバの応答 (`skill_map.dev_mode`) が来るまでは `undefined` なので偽 = 伏せる側に
 * 倒す。先に明かしてから伏せ直すと、一瞬だけ霧の星の実名が出る。
 *
 * クライアントの値だけで判断していたのが Issue #271 の本体 — `DEV_MODE` の無い本番でも
 * ぼかしが外れ、FAB も出ないので受講者に戻す手段が無かった。
 */
export function revealsDevMap(requested: boolean, serverDevMode: boolean | undefined): boolean {
  return requested && serverDevMode === true;
}

function readStored(): boolean {
  try {
    return parseDevModeStored(localStorage.getItem(DEV_MODE_STORAGE_KEY));
  } catch {
    // 読めない (プライベートモードなど) ときも伏せる側へ倒す。
    return false;
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
