// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set
//
// 次の20問を、Set を使って書いてください。引数と戻り値には型注釈を付けること（Set<string> など）。型 User は定義済みです。
// 引数の配列や Set を変えないこと。引数の型は string[] や Set<string> と書く（readonly や ReadonlySet は使わない）。
// Set は、入れた順を覚えています。配列にしたいときは [...set] のようにスプレッド構文を使う。
// Set の union や intersection などのメソッドは、このテンプレートの設定（ES2022）では使えないので、has や add を使って書く。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type User = { id: number; name: string };

// 問1 配列から Set を作る
//     例: toSet(["a", "b", "a"]) → Set { "a", "b" }
export function toSet() {}

// 問2 重複を除いた要素の数を返す
//     例: uniqueCount(["a", "b", "a"]) → 2
export function uniqueCount() {}

// 問3 同じ値が2回以上出てきたら true
//     例: hasDuplicates([1, 2, 1]) → true
export function hasDuplicates() {}

// 問4 重複を除き、小さい順に並べた配列を返す
//     例: uniqueSorted([3, 1, 3, 2]) → [1, 2, 3]
export function uniqueSorted() {}

// 問5 重複を除いた文字を、出てきた順につないだ文字列を返す
//     例: uniqueChars("banana") → "ban"
export function uniqueChars() {}

// 問6 value を足した新しい Set を返す（元の Set は変えない）
//     例: withAdded(Set { "a" }, "b") → Set { "a", "b" }
export function withAdded() {}

// 問7 value を取り除いた新しい Set を返す（元の Set は変えない）
//     例: withRemoved(Set { "a", "b" }, "a") → Set { "b" }
export function withRemoved() {}

// 問8 value があれば取り除き、なければ足した新しい Set を返す（元の Set は変えない）
//     例: toggle(Set { "a" }, "a") → Set {}
export function toggle() {}

// 問9 a か b のどちらかにある要素の Set を返す（a の順の後に、b にだけある要素を b の順に）
//     例: union(Set { 1, 2 }, Set { 2, 3 }) → Set { 1, 2, 3 }
export function union() {}

// 問10 a と b の両方にある要素の Set を返す（a の順）
//     例: intersection(Set { 1, 2, 3 }, Set { 3, 1 }) → Set { 1, 3 }
export function intersection() {}

// 問11 a にあって b にない要素の Set を返す（a の順）
//     例: difference(Set { 1, 2, 3 }, Set { 2 }) → Set { 1, 3 }
export function difference() {}

// 問12 a と b のどちらか一方にだけある要素の Set を返す（a にだけあるものを a の順に、その後に b にだけあるものを b の順に）
//     例: symmetricDifference(Set { 1, 2 }, Set { 2, 3 }) → Set { 1, 3 }
export function symmetricDifference() {}

// 問13 a の要素がすべて b にあれば true（a が空なら true）
//     例: isSubset(Set { 1, 2 }, Set { 1, 2, 3 }) → true
export function isSubset() {}

// 問14 values の要素がすべて set にあれば true
//     例: hasAll(Set { "read", "write" }, ["read"]) → true
export function hasAll() {}

// 問15 values の要素のどれか1つでも set にあれば true
//     例: hasAny(Set { "read" }, ["write", "read"]) → true
export function hasAny() {}

// 問16 a と b の両方に出てくる文字を、a の順に重複なくつないだ文字列を返す
//     例: commonChars("banana", "cabin") → "ban"
export function commonChars() {}

// 問17 前から見て、2回目に出てきた最初の要素を返す。なければ undefined
//     例: firstRepeated(["a", "b", "c", "b", "a"]) → "b"
export function firstRepeated() {}

// 問18 同じ id のユーザーは最初の1人だけを残した配列を返す
//     例: uniqueById([{ id: 1, name: "山田" }, { id: 1, name: "山田2" }]) → [{ id: 1, name: "山田" }]
export function uniqueById() {}

// 問19 投稿のタグを、重複なく出てきた順に並べた配列を返す
//     例: allTags([{ tags: ["ts", "js"] }, { tags: ["js", "css"] }]) → ["ts", "js", "css"]
export function allTags() {}

// 問20 順番と重複を無視して、a と b が同じ要素の集まりなら true
//     例: sameMembers(["a", "b", "a"], ["b", "a"]) → true
export function sameMembers() {}
