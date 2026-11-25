// 問11 いくつかの Partial<Options> を、前から順に重ねた Partial<Options> を返す（残余引数で受け取る）
//     例: mergePatches({ size: 1 }, { size: 2, bold: true }) → { size: 2, bold: true }
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function mergePatches(...patches: Partial<Options>[]): Partial<Options> {
  let result: Partial<Options> = {};
  for (const patch of patches) {
    result = { ...result, ...patch };
  }
  return result;
}
