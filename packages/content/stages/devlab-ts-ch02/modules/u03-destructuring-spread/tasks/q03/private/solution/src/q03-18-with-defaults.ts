// 問18 { size?, color? } に、足りない値を size 10、color "black" で補ったオブジェクトを返す（既定値のオブジェクトの後ろに、スプレッドで重ねる）
//     例: withDefaults({ color: "red" }) → { size: 10, color: "red" }
// 引数と戻り値には型注釈を付けます。
export function withDefaults(options: { size?: number; color?: string }): {
  size: number;
  color: string;
} {
  return { size: 10, color: "black", ...options };
}
