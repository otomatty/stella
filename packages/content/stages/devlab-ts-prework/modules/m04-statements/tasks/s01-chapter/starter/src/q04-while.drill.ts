// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 何回繰り返すか前もって分からないときは while 文を使う。少なくとも1回は実行したいときは do-while 文を使う。
// ループを途中で抜けるときは break、その回だけ飛ばすときは continue を使う。
// 引数には値を入れ直せないので、変えたい値は let の変数に写してから使う。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 1以上の整数の桁数を返す（while 文で10で割っていく）
//     例: countDigits(12345) → 5
export function countDigits() {}

// 問2 偶数のあいだ2で割り続け、奇数になった値を返す（0 は 0 を返す）
//     例: halveUntilOdd(40) → 5
export function halveUntilOdd() {}

// 問3 n 以上で最小の、2の累乗（1, 2, 4, 8…）を返す
//     例: powerOfTwoAtLeast(5) → 8
export function powerOfTwoAtLeast() {}

// 問4 0 になるまでの手順の数を返す。偶数なら2で割り、奇数なら1を引く
//     例: stepsToZero(14) → 6
export function stepsToZero() {}

// 問5 1 + 2 + … + k が limit 以下になる、いちばん大きい k を返す
//     例: maxCountWithin(10) → 4
export function maxCountWithin() {}

// 問6 0以上の整数の桁を逆に並べた数を返す（文字列にしない）
//     例: reverseNumber(1230) → 321
export function reverseNumber() {}

// 問7 素数なら true（2 から順に、i × i が n 以下のあいだ割り切れるかを調べる）
//     例: isPrime(13) → true
export function isPrime() {}

// 問8 n より大きい、最小の素数を返す
//     例: nextPrime(13) → 17
export function nextPrime() {}

// 問9 2つの正の整数の最小公倍数を返す（a の倍数を順に調べ、b で割り切れたら止める）
//     例: lcm(4, 6) → 12
export function lcm() {}

// 問10 1〜n の合計を返す。ただし3の倍数は飛ばす（continue）
//     例: sumSkipThrees(6) → 12
export function sumSkipThrees() {}

// 問11 limit より大きい最初の要素の番号を返す（見つかったら break）。なければ -1
//     例: firstIndexOver([1, 5, 10], 4) → 1
export function firstIndexOver() {}

// 問12 先頭に続く「0」の数を返す
//     例: leadingZeros("000120") → 3
export function leadingZeros() {}

// 問13 先頭の「0」を取り除く。すべて 0 なら "0" を返す
//     例: trimZeros("00120") → "120"
export function trimZeros() {}

// 問14 各桁を足すことを、1桁になるまで繰り返した値を返す
//     例: digitalRoot(9875) → 2
export function digitalRoot() {}

// 問15 0以上の整数を2進数で書いたときの桁数を返す。0 は 1
//     例: bitLength(10) → 4
export function bitLength() {}

// 問16 text をつなげていき、ちょうど length 文字にして返す（長くなった分は切る）
//     例: repeatToLength("ab", 5) → "ababa"
export function repeatToLength() {}

// 問17 n を d で割り切れなくなるまで割ったとき、割れた回数を返す（d は 2 以上）
//     例: divisibleTimes(48, 2) → 4
export function divisibleTimes() {}

// 問18 正の数だけを合計する。0 以下は continue で飛ばす
//     例: sumPositives([3, -1, 0, 5]) → 8
export function sumPositives() {}

// 問19 2回目に出てきた最初の文字を返す（見つかったら break）。なければ undefined
//     例: firstRepeatedChar("abcbd") → "b"
export function firstRepeatedChar() {}

// 問20 0以上の整数の各桁を、上の桁から並べた配列を返す。0 は [0]（do-while で書く）
//     例: digitsOf(305) → [3, 0, 5]
export function digitsOf() {}
