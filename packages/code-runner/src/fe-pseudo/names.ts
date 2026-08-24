/** 生成 JS が参照する組み込み名。学習者の変数・関数名と衝突したら別名に逃がす。 */
export const RUNTIME_BUILTIN_NAMES = new Set(["Array", "Number", "Math", "console"]);

/** 擬似言語から直接呼べない JS / ランタイム内部名。 */
export const FORBIDDEN_CALLEES = new Set(["eval", "Function"]);

export function jsUserIdent(name: string): string {
  return RUNTIME_BUILTIN_NAMES.has(name) ? `__feUser_${name}` : name;
}
