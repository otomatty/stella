type BrandStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function legacyKeyOf(key: string): string {
  return key.replace(/^stella_/, "falcon_");
}

/** 同じオリジンの旧キーを移す。新しい値と利用者ごとの接尾辞は維持する。 */
export function readStellaStorage(storage: BrandStorage, key: string): string | null {
  const current = storage.getItem(key);
  if (current !== null) return current;
  const legacyKey = legacyKeyOf(key);
  if (legacyKey === key) return null;
  const legacy = storage.getItem(legacyKey);
  if (legacy === null) return null;
  try {
    storage.setItem(key, legacy);
  } catch {
    // 書けなければ旧値を残し、この読み取りでは使う。
  }
  // 旧キーは消さない。開いたままの旧タブは削除をログアウトとして受け取る。
  return legacy;
}

/** ログアウト後に旧トークンを読み戻さないよう、両方のキーを消す。 */
export function removeStellaStorage(storage: BrandStorage, key: string): void {
  const legacyKey = legacyKeyOf(key);
  if (legacyKey !== key) storage.removeItem(legacyKey);
  storage.removeItem(key);
}
