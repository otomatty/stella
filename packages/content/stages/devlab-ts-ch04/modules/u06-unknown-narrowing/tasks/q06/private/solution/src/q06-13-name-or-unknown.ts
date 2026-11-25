// 問13 name プロパティが文字列ならそれを、そうでなければ "不明" を返す
//     例: nameOrUnknown({ name: "山田", age: 30 }) → "山田"
// 引数と戻り値に型注釈を付けます。
// プロパティの有無は in で確かめます。
export function nameOrUnknown(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return value.name;
  }
  return "不明";
}
