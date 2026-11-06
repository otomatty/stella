// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 次の20問を解いてください。定数と関数は定義済みです（書き換えない）。
// 型の位置で typeof 定数 と書くと、その定数の型になる。(typeof 配列)[number] で配列の要素の型、(typeof オブジェクト)["キー"] でプロパティの型を取り出せる。
// 型を書く問題は、型を手で書き写さず、必ず typeof を使って作ること（値を直したときに型も変わるように）。
// 関数を書く問題は、引数と戻り値に型注釈を付けること。型注釈にも typeof を使う。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export const DEFAULT_USER = { name: "ゲスト", age: 0, admin: false };
export const ORIGIN = { x: 0, y: 0 };
export const SETTINGS = {
  theme: "light",
  fontSize: 14,
  notifications: { email: true, push: false },
};
export const COLORS = ["red", "green", "blue"] as const;
export const LEVELS = [1, 2, 3] as const;
export const ROLE_LABELS = { admin: "管理者", member: "一般" } as const;
export const ENDPOINTS = { users: "/api/users", rooms: "/api/rooms" } as const;
export const VERSION = "1.2.3";
export const MAX_SIZE = 100;
export const TAGS = ["new", "sale"];

export function makeItem(name: string, price: number) {
  return { name, price, createdAt: 0 };
}

export function handleClick(x: number, y: number): string {
  return `${x},${y}`;
}

// 問1 型 DefaultUser を DEFAULT_USER から作る
// ここに型 DefaultUser を書く

// 問2 型 Point を ORIGIN から作る
// ここに型 Point を書く

// 問3 型 Settings を SETTINGS から作る
// ここに型 Settings を書く

// 問4 型 Notifications を、SETTINGS の notifications プロパティの型として作る（(typeof SETTINGS)["notifications"]）
// ここに型 Notifications を書く

// 問5 型 Color を、COLORS の要素の型として作る（"red" | "green" | "blue" になる）
// ここに型 Color を書く

// 問6 型 Level を、LEVELS の要素の型として作る（1 | 2 | 3 になる）
// ここに型 Level を書く

// 問7 型 RoleLabels を ROLE_LABELS から作る（as const が付いているので、値もリテラル型になる）
// ここに型 RoleLabels を書く

// 問8 型 Endpoint を、ENDPOINTS のすべての値のユニオン型として作る（(typeof ENDPOINTS)[keyof typeof ENDPOINTS]）
// ここに型 Endpoint を書く

// 問9 型 Version を VERSION から作る（const で宣言した文字列なので、リテラル型 "1.2.3" になる）
// ここに型 Version を書く

// 問10 型 MaxSize を MAX_SIZE から作る
// ここに型 MaxSize を書く

// 問11 型 Tag を、TAGS の要素の型として作る（as const がないので string になる）
// ここに型 Tag を書く

// 問12 型 Item を、関数 makeItem の戻り値の型として作る（ReturnType<typeof makeItem>）
// ここに型 Item を書く

// 問13 型 ClickHandler を、関数 handleClick の型として作る（typeof handleClick）
// ここに型 ClickHandler を書く

// 問14 DEFAULT_USER のコピーを返す関数 cloneUser() を書く。戻り値の型は typeof DEFAULT_USER
//     例: cloneUser() → { name: "ゲスト", age: 0, admin: false }（DEFAULT_USER とは別のオブジェクト）
export function cloneUser() {}

// 問15 点を dx、dy だけ動かした新しい点を返す。点の型は typeof ORIGIN
//     例: movePoint({ x: 1, y: 2 }, 3, 4) → { x: 4, y: 6 }
export function movePoint() {}

// 問16 settings の fontSize だけを変えた新しい設定を返す。設定の型は typeof SETTINGS
//     例: withFontSize(SETTINGS, 18).fontSize → 18
export function withFontSize() {}

// 問17 文字列が COLORS のどれかなら true。戻り値の型は text is (typeof COLORS)[number]
//     例: isColor("red") → true
export function isColor() {}

// 問18 1 → 2 → 3 の順に次のレベルを返す（3 は 3 のまま）。引数と戻り値の型は (typeof LEVELS)[number]
//     例: nextLevel(1) → 2
export function nextLevel() {}

// 問19 ROLE_LABELS からラベルを返す。引数の型は keyof typeof ROLE_LABELS
//     例: roleLabel("admin") → "管理者"
export function roleLabel() {}

// 問20 ENDPOINTS から URL を返す。引数の型は keyof typeof ENDPOINTS
//     例: endpointOf("rooms") → "/api/rooms"
export function endpointOf() {}
