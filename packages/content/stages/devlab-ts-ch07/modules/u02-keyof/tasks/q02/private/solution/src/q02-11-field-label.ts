// 問11 User のプロパティ名を日本語にする。id は "ID"、name は "名前"、email は "メール"、age は "年齢"（switch ですべての場合を書く）
//     例: fieldLabel("email") → "メール"
// 引数と戻り値に型注釈を付けます。
// 引数の型に keyof User を使います。

export type User = { id: number; name: string; email: string; age: number };

export function fieldLabel(key: keyof User): string {
  switch (key) {
    case "id":
      return "ID";
    case "name":
      return "名前";
    case "email":
      return "メール";
    case "age":
      return "年齢";
  }
}
