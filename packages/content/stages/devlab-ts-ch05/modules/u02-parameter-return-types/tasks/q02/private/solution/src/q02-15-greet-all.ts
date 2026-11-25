// 問15 それぞれの名前に「さん、こんにちは」を付けた配列を返す
//     例: greetAll(["山田", "佐藤"]) → ["山田さん、こんにちは", "佐藤さん、こんにちは"]
// 引数と戻り値には型注釈を付けてください。

export function greetAll(names: readonly string[]): string[] {
  return names.map((name) => `${name}さん、こんにちは`);
}
