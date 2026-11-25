// 問1 scores から name の点数を返す。なければ 0
//     例: scoreOf({ 山田: 80 }, "山田") → 80
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーがない場合の値は ?? で補えます。
export function scoreOf(scores: { [name: string]: number }, name: string): number {
  return scores[name] ?? 0;
}
