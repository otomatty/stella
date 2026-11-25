// 問2 [数, 名前] を [名前, 数] に並べ替える
//     例: flipPair([3, "りんご"]) → ["りんご", 3]
// 引数と戻り値には型注釈を付けます。
// タプルの要素は配列の分割代入で取り出せます。
export function flipPair(pair: [number, string]): [string, number] {
  const [count, name] = pair;
  return [name, count];
}
