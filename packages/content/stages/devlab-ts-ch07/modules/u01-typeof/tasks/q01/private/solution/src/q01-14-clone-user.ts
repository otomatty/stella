// 問14 DEFAULT_USER のコピーを返す関数 cloneUser() を書く。戻り値の型は typeof DEFAULT_USER
//     例: cloneUser() → { name: "ゲスト", age: 0, admin: false }（DEFAULT_USER とは別のオブジェクト）
// 定義済みの定数は書き換えません。
// 戻り値に型注釈を付けます。

export const DEFAULT_USER = { name: "ゲスト", age: 0, admin: false };

export function cloneUser(): typeof DEFAULT_USER {
  return { ...DEFAULT_USER };
}
