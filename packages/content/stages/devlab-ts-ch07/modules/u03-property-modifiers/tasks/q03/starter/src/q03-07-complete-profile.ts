// 問7 Profile の足りないところを、email は ""、age は 0 で補って Required<Profile> を返す
//     例: completeProfile({ name: "山田" }) → { name: "山田", email: "", age: 0 }
// 引数と戻り値に型注釈を付けます。

export type Profile = { name: string; email?: string; age?: number };

export function completeProfile() {}
