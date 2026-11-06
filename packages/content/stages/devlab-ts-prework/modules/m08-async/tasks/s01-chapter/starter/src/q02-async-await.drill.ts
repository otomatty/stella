// 08-q02 async と await ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await
//
// 次の20問を、async と await を使って書いてください。型 User と、関数 fetchUser、wait は定義済みです。
// fetchUser(id) は id のユーザーを取得します（いない id なら "ユーザー 9 はいません" の Error で失敗する）。
// 戻り値の型は Promise<number> のように書く。async 関数の中では、Promise の結果を await で受け取る。
// 失敗を受け止めるときは try・catch を使う。try の中で Promise を return するときは return await と書く。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type User = { id: number; name: string; age: number };

const USERS: User[] = [
  { id: 1, name: "山田", age: 34 },
  { id: 2, name: "佐藤", age: 19 },
  { id: 3, name: "鈴木", age: 52 },
  { id: 4, name: "田中", age: 20 },
];

// id のユーザーを取得する。いなければ失敗する
export function fetchUser(id: number): Promise<User> {
  const user = USERS.find((u) => u.id === id);
  return user === undefined
    ? Promise.reject(new Error(`ユーザー ${id} はいません`))
    : Promise.resolve(user);
}

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 問1 fetchUser で取得して、年齢を返す
//     例: getAge(1) → 34 で解決する
export function getAge() {}

// 問2 取得して、名前を返す
//     例: getName(2) → "佐藤" で解決する
export function getName() {}

// 問3 取得して、20歳以上なら true
//     例: isAdult(4) → true で解決する
export function isAdult() {}

// 問4 取得して、"こんにちは、山田さん" の形のあいさつを返す
//     例: greetUser(3) → "こんにちは、鈴木さん" で解決する
export function greetUser() {}

// 問5 async のアロー関数で書く。export const nameLength = async (id: number): Promise<number> => … の形で、名前の文字数を返す
//     例: nameLength(1) → 2 で解決する
// ここに nameLength をアロー関数で書く

// 問6 取得して、years 年後の年齢を返す
//     例: ageAfter(2, 5) → 24 で解決する
export function ageAfter() {}

// 問7 a と b のユーザーを、順番に await して取得し、年齢の合計を返す
//     例: sumAges(1, 2) → 53 で解決する
export function sumAges() {}

// 問8 a と b のユーザーの取得を一度に始め、Promise.all と await で待って、年齢の合計を返す
//     例: sumAgesAtOnce(3, 4) → 72 で解決する
export function sumAgesAtOnce() {}

// 問9 ids のユーザーを for...of と await で1人ずつ順番に取得し、名前の配列を返す
//     例: namesInOrder([3, 1]) → ["鈴木", "山田"] で解決する
export function namesInOrder() {}

// 問10 ids のユーザーの取得を map で一度に始め、Promise.all で待って、名前の配列を返す
//     例: namesAtOnce([2, 4]) → ["佐藤", "田中"] で解決する
export function namesAtOnce() {}

// 問11 ids のユーザーを同時に取得し、いちばん年上の人の名前を返す。ids が空なら undefined
//     例: oldestName([1, 3, 4]) → "鈴木" で解決する
export function oldestName() {}

// 問12 ids のユーザーを同時に取得し、年齢の平均を返す。ids が空なら 0
//     例: averageAge([1, 2]) → 26.5 で解決する
export function averageAge() {}

// 問13 try・catch で、取得できれば名前、失敗したら "不明" を返す
//     例: safeName(9) → "不明" で解決する
export function safeName() {}

// 問14 取得できれば true、失敗したら false を返す
//     例: userExists(9) → false で解決する
export function userExists() {}

// 問15 ids のユーザーを順番に取得し、取得できた人数を返す（失敗しても最後まで続ける）
//     例: countFound([1, 9, 3, 8]) → 2 で解決する
export function countFound() {}

// 問16 ids のユーザーを順番に取得し、最初に見つかった20歳以上の人の名前を返す。失敗した id は飛ばす。いなければ undefined
//     例: firstAdult([2, 9, 4, 1]) → "田中" で解決する
export function firstAdult() {}

// 問17 wait(ms) を await で待ってから、value を返す
//     例: waitAndReturn(100, "a") → 100ミリ秒後に "a" で解決する
export function waitAndReturn() {}

// 問18 tasks（Promise を返す関数の配列）を前から1つずつ呼び、前の task が終わってから次を呼ぶ。結果の配列を返す
//     例: runInOrder([a を返す task, b を返す task]) → ["a", "b"] で解決する
export function runInOrder() {}

// 問19 tasks をすべて一度に呼び、Promise.all で待って、結果の配列を返す
//     例: runAtOnce([a を返す task, b を返す task]) → ["a", "b"] で解決する
export function runAtOnce() {}

// 問20 tasks を前から順番に呼び、失敗したらそこで止めて、それまでに成功した結果の配列を返す（失敗は投げない）
//     例: untilFailure([a, 失敗する task, c]) → ["a"] で解決し、c は呼ばない
export function untilFailure() {}
