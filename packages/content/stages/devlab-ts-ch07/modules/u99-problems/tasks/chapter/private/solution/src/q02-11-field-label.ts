// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type User = { id: number; name: string; email: string; age: number };

// 問11
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
