// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// length、slice、includes、startsWith、endsWith、padStart、trim、toUpperCase、toLowerCase、replaceAll、indexOf などを使う。
// 文字列の組み立ては、+ ではなくテンプレートリテラル（`…${式}…`）で書く。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 文字数を返す
//     例: lengthOf("Agora") → 5
export function lengthOf() {}

// 問2 英字を大文字にする
//     例: toUpper("abc") → "ABC"
export function toUpper() {}

// 問3 最初の3文字を返す
//     例: firstThree("TypeScript") → "Typ"
export function firstThree() {}

// 問4 最後の1文字を返す。空の文字列なら空の文字列を返す
//     例: lastChar("hello") → "o"
export function lastChar() {}

// 問5 text に word が含まれていれば true を返す
//     例: hasWord("I like TypeScript", "Type") → true
export function hasWord() {}

// 問6 「#」で始まっていれば true を返す
//     例: isHashtag("#agora") → true
export function isHashtag() {}

// 問7 ファイル名が「.png」で終わっていれば true を返す（大文字の「.PNG」も true）
//     例: isPng("photo.PNG") → true
export function isPng() {}

// 問8 番号を4桁になるように前を0で埋める
//     例: padId(7) → "0007"
export function padId() {}

// 問9 前後の空白を取り除き、英字を小文字にする
//     例: normalize("  Hello ") → "hello"
export function normalize() {}

// 問10 半角スペースをすべて「_」に置き換える
//     例: snakeSpaces("a b c") → "a_b_c"
export function snakeSpaces() {}

// 問11 「@」が何文字目（0から数える）にあるかを返す。なければ -1
//     例: atPosition("taro@example.com") → 4
export function atPosition() {}

// 問12 最初の1文字だけを大文字にする
//     例: capitalize("hello") → "Hello"
export function capitalize() {}

// 問13 text の前後に mark を付ける
//     例: surround("注意", "**") → "**注意**"
export function surround() {}

// 問14 前から読んでも後ろから読んでも同じなら true を返す
//     例: isPalindrome("level") → true
export function isPalindrome() {}

// 問15 「090-1234-5678」の形の電話番号の、真ん中の4桁を「****」にする
//     例: maskPhone("090-1234-5678") → "090-****-5678"
export function maskPhone() {}

// 問16 ファイル名の拡張子（最後の「.」より後ろ）を返す。「.」がなければ空の文字列
//     例: extension("photo.jpeg") → "jpeg"
export function extension() {}

// 問17 時と分を「09:05」の形にする（どちらも2桁）
//     例: clockText(9, 5) → "09:05"
export function clockText() {}

// 問18 英字の母音（a, e, i, o, u）を取り除く（replaceAll を5回使うか、正規表現 /[aeiou]/g と replace）
//     例: removeVowels("typescript") → "typscrpt"
export function removeVowels() {}

// 問19 index 番目（0から数える）の文字を返す。範囲外なら空の文字列（charAt を使う）
//     例: charAtOrEmpty("abc", 1) → "b"
export function charAtOrEmpty() {}

// 問20 大文字と小文字の違いを無視して、同じ文字列なら true を返す
//     例: sameIgnoringCase("Agora", "AGORA") → true
export function sameIgnoringCase() {}
