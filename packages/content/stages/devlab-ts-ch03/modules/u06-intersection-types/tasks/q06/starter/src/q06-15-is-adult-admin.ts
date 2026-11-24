// 問15 型 Member を Named & Aged & { role: "admin" | "member" } として定義して export し、isAdultAdmin(member: Member) を書く。role が admin で18歳以上なら true
//     例: isAdultAdmin({ name: "山田", age: 30, role: "admin" }) → true
// 引数と戻り値に型注釈を付ける。
// type を使って、& でつないだ型に名前を付ける。

export type Named = { name: string };

export type Aged = { age: number };

// ここに型 Member と関数 isAdultAdmin を書く
