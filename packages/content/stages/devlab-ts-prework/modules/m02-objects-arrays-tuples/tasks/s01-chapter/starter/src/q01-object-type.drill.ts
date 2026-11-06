// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// オブジェクトの型は { name: string; age: number } のように書く。type で名前を付けてもよい。
// オブジェクトを作るときは { x: x } ではなく { x } のように、プロパティ名の省略記法を使う（ESLint でも確かめます）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 利用者 { name, age } の name を返す
//     例: getName({ name: "山田", age: 30 }) → "山田"
export function getName() {}

// 問2 利用者 { name, age } の age を返す
//     例: getAge({ name: "山田", age: 30 }) → 30
export function getAge() {}

// 問3 x と y から、座標のオブジェクト { x, y } を作る
//     例: makePoint(1, 2) → { x: 1, y: 2 }
export function makePoint() {}

// 問4 座標 { x, y } を「(x, y)」の文字列にする
//     例: pointText({ x: 1, y: 2 }) → "(1, 2)"
export function pointText() {}

// 問5 name と age から、利用者のオブジェクト { name, age } を作る
//     例: makeUser("山田", 30) → { name: "山田", age: 30 }
export function makeUser() {}

// 問6 利用者 { name, age } が18歳以上なら true
//     例: isAdultUser({ name: "山田", age: 30 }) → true
export function isAdultUser() {}

// 問7 本 { title, price } を「タイトル（価格円）」にする。価格は3桁ごとにカンマで区切る
//     例: bookLabel({ title: "TypeScript入門", price: 2800 }) → "TypeScript入門（2,800円）"
export function bookLabel() {}

// 問8 title と price から、本のオブジェクト { title, price } を作る
//     例: makeBook("React入門", 2400) → { title: "React入門", price: 2400 }
export function makeBook() {}

// 問9 注文 { price, quantity } の小計（価格 × 個数）を返す
//     例: subtotal({ price: 150, quantity: 3 }) → 450
export function subtotal() {}

// 問10 長方形 { width, height } の面積を返す
//     例: rectArea({ width: 3, height: 4 }) → 12
export function rectArea() {}

// 問11 width と height から、長方形のオブジェクト { width, height } を作る
//     例: makeRect(3, 4) → { width: 3, height: 4 }
export function makeRect() {}

// 問12 人 { firstName, lastName } を「姓 名」の順に半角スペースでつなぐ
//     例: fullNameOf({ firstName: "太郎", lastName: "山田" }) → "山田 太郎"
export function fullNameOf() {}

// 問13 firstName と lastName から、人のオブジェクト { firstName, lastName } を作る
//     例: makePerson("太郎", "山田") → { firstName: "太郎", lastName: "山田" }
export function makePerson() {}

// 問14 測定値 { value, unit } を、値と単位をつないだ文字列にする
//     例: measureText({ value: 25, unit: "℃" }) → "25℃"
export function measureText() {}

// 問15 2つのオブジェクト { name } の name が同じなら true
//     例: isSameName({ name: "山田" }, { name: "山田" }) → true
export function isSameName() {}

// 問16 成績 { math, english, science } の合計点を返す
//     例: scoreTotal({ math: 80, english: 70, science: 90 }) → 240
export function scoreTotal() {}

// 問17 3教科の点数から、成績のオブジェクト { math, english, science } を作る
//     例: makeScore(80, 70, 90) → { math: 80, english: 70, science: 90 }
export function makeScore() {}

// 問18 色 { r, g, b } を「rgb(r, g, b)」の文字列にする
//     例: colorText({ r: 255, g: 0, b: 0 }) → "rgb(255, 0, 0)"
export function colorText() {}

// 問19 r、g、b から、色のオブジェクト { r, g, b } を作る
//     例: makeColor(0, 128, 255) → { r: 0, g: 128, b: 255 }
export function makeColor() {}

// 問20 区間 { start, end } の真ん中の値を返す
//     例: middleOf({ start: 2, end: 8 }) → 5
export function middleOf() {}
