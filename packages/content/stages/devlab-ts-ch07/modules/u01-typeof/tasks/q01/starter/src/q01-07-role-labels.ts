// 問7 型 RoleLabels を ROLE_LABELS から作る（as const が付いているので、値もリテラル型になる）
// 定義済みの定数は書き換えません。
// 型は手で書き写さず、typeof で作ります。

export const ROLE_LABELS = { admin: "管理者", member: "一般" } as const;

// ここに型 RoleLabels を書く
