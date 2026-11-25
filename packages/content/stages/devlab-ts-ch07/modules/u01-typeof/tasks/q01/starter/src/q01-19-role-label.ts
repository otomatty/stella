// 問19 ROLE_LABELS からラベルを返す。引数の型は keyof typeof ROLE_LABELS
//     例: roleLabel("admin") → "管理者"
// 定義済みの定数は書き換えません。
// 引数と戻り値に型注釈を付けます。

export const ROLE_LABELS = { admin: "管理者", member: "一般" } as const;

export function roleLabel() {}
