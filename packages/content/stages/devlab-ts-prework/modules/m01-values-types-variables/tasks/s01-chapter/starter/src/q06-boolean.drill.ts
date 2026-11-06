// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// どの関数も true か false を返す。条件には boolean になる式を書く（ESLint の strict-boolean-expressions）。
// if 文を使わずに、return の1行で書けるものが多い。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 0より大きければ true
//     例: isPositive(3) → true
export function isPositive() {}

// 問2 0より小さければ true
//     例: isNegative(-1) → true
export function isNegative() {}

// 問3 奇数なら true（負の数でも正しく判定する）
//     例: isOdd(-3) → true
export function isOdd() {}

// 問4 13歳以上19歳以下なら true
//     例: isTeen(15) → true
export function isTeen() {}

// 問5 曜日の番号（0が日曜、6が土曜）が土日なら true
//     例: isWeekend(6) → true
export function isWeekend() {}

// 問6 1文字の英字が母音（a, e, i, o, u。大文字も含む）なら true
//     例: isVowel("E") → true
export function isVowel() {}

// 問7 逆の真偽値を返す
//     例: not(true) → false
export function not() {}

// 問8 2つとも true なら true
//     例: both(true, false) → false
export function both() {}

// 問9 どちらか1つでも true なら true
//     例: either(false, true) → true
export function either() {}

// 問10 どちらか片方だけが true なら true（両方 true なら false）
//     例: onlyOne(true, true) → false
export function onlyOne() {}

// 問11 空の文字列なら true
//     例: isEmpty("") → true
export function isEmpty() {}

// 問12 空の文字列か、空白だけなら true
//     例: isBlank("   ") → true
export function isBlank() {}

// 問13 数字（0〜9）が1文字でも含まれていれば true（正規表現 /\d/ の test メソッドを使う）
//     例: hasDigit("abc1") → true
export function hasDigit() {}

// 問14 8文字以上で、数字と英大文字を1文字ずつ以上含めば true
//     例: isStrongPassword("Agora2026") → true
export function isStrongPassword() {}

// 問15 2つの数がどちらも正、またはどちらも負なら true（0 が含まれていれば false）
//     例: isSameSign(-2, -5) → true
export function isSameSign() {}

// 問16 所持金が価格以上で、在庫があれば true
//     例: canBuy(1000, 800, true) → true
export function canBuy() {}

// 問17 3の倍数か5の倍数なら true
//     例: isMultipleOf3Or5(10) → true
export function isMultipleOf3Or5() {}

// 問18 value が min より小さいか、max より大きければ true
//     例: isOutOfRange(11, 1, 10) → true
export function isOutOfRange() {}

// 問19 空ではなく、max 文字以下なら true
//     例: isValidName("山田", 10) → true
export function isValidName() {}

// 問20 店が開いていれば true。平日は9時以上18時未満、休日は10時以上15時未満に開いている
//     例: isOpen(9, false) → true
export function isOpen() {}
