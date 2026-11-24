// 問17 型 Credentials を Pick<User, "email" | "password"> として作る。login(users, credentials) は、email と password が一致する User を、password を除いて返す。いなければ undefined
//     例: login(users, { email: "y@example.com", password: "x" }) → password のない山田
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; password: string; age: number };

// ここに型 Credentials と関数 login を書く
