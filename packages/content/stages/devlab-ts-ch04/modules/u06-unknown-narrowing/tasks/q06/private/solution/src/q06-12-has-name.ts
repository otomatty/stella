// 問12 null でないオブジェクトで、name プロパティが文字列なら true（"name" in value を使う）
//     例: hasName({ name: "山田" }) → true
// 引数と戻り値に型注釈を付けます。
export function hasName(value: unknown): boolean {
  return (
    typeof value === "object" && value !== null && "name" in value && typeof value.name === "string"
  );
}
