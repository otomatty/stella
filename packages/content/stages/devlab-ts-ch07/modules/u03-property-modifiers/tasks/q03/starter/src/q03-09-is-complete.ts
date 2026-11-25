// 問9 email と age の両方があれば true。戻り値の型は profile is Required<Profile>
//     例: isComplete({ name: "山田" }) → false
// 引数と戻り値に型注釈を付けます。

export type Profile = { name: string; email?: string; age?: number };

export function isComplete() {}
