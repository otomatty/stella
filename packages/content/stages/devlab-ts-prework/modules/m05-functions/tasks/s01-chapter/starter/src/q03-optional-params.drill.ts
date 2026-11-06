// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 「省略できる」と書いた引数は、title?: string のように ? を付ける。省略されると undefined になるので、?? や === undefined で扱う。
// デフォルト引数（= 値）は使わず、? で書くこと（デフォルト引数は q04 で扱う）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 name と、省略できる title。title があれば「山田部長」、なければ「山田さん」
//     例: greetWithTitle("山田") → "山田さん"
export function greetWithTitle() {}

// 問2 n と、省略できる digits。小数第 digits 位までの文字列にする。省略したら 0
//     例: fixed(3.14159, 2) → "3.14"
export function fixed() {}

// 問3 last と、省略できる first。「山田 太郎」、first がなければ「山田」
//     例: nameText("山田") → "山田"
export function nameText() {}

// 問4 text と、省略できる times。text を times 回つなぐ。省略したら1回
//     例: repeatOnce("ab") → "ab"
export function repeatOnce() {}

// 問5 from と、省略できる to。from から to まで1ずつ減らした配列を返す。to を省略したら 1
//     例: countdownFrom(3) → [3, 2, 1]
export function countdownFrom() {}

// 問6 text と、省略できる max。max 文字を超えたら、max 文字に切って「…」を付ける。省略したら 10
//     例: cut("TypeScript入門講座", 6) → "TypeSc…"
export function cut() {}

// 問7 n と、省略できる width。width 桁になるよう前を0で埋める。省略したら 2
//     例: padTwo(5) → "05"
export function padTwo() {}

// 問8 price と、省略できる unit。「1,200円」の形。unit を省略したら「円」
//     例: priceLabel(1200, "ドル") → "1,200ドル"
export function priceLabel() {}

// 問9 text と、省略できる count。最初の count 単語（半角スペース区切り）を返す。省略したら 1
//     例: firstWords("a b c d", 2) → "a b"
export function firstWords() {}

// 問10 name と、省略できる age。{ name, age? } を返す。age を省略したら age を付けない
//     例: makeUser("山田") → { name: "山田" }
export function makeUser() {}

// 問11 a と、省略できる b。b があれば平均、なければ a を返す
//     例: averageOf2(4) → 4
export function averageOf2() {}

// 問12 name と、省略できる color。「<name>」、color があれば「<name:color>」
//     例: tagText("重要", "red") → "<重要:red>"
export function tagText() {}

// 問13 text と、省略できる min。文字数が min 以上なら true。省略したら 8
//     例: isLongEnough("abcdefgh") → true
export function isLongEnough() {}

// 問14 message と、省略できる level（"info" か "warn"）。「[INFO] message」の形。省略したら info
//     例: logText("起動", "warn") → "[WARN] 起動"
export function logText() {}

// 問15 n と、省略できる step。n にいちばん近い step の倍数を返す。省略したら 1
//     例: roundStep(17, 5) → 15
export function roundStep() {}

// 問16 省略できる age だけを受け取る。「30歳」、省略したら「年齢不明」
//     例: ageLabel() → "年齢不明"
export function ageLabel() {}

// 問17 a と、省略できる b と c。渡されたものだけを足す
//     例: sumUpTo3(1, 2) → 3
export function sumUpTo3() {}

// 問18 path と、省略できる query。「/path?query」、query がなければ「/path」
//     例: buildUrl("/search", "q=ts") → "/search?q=ts"
export function buildUrl() {}

// 問19 n と、省略できる min と max。min 以上 max 以下なら true。省略したら min は 0、max は 100
//     例: inRange(150) → false
export function inRange() {}

// 問20 first と、省略できる last。「T」、last があれば「T.Y」
//     例: initialsOf("Taro", "Yamada") → "T.Y"
export function initialsOf() {}
