// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 関数を返す関数の戻り値の型は (x: number) => number のように書く。
// 返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 受け取った数に n を足す関数を返す
//     例: makeAdder(3)(4) → 7
export function makeAdder() {}

// 問2 受け取った数を n 倍する関数を返す
//     例: makeTimes(2)(5) → 10
export function makeTimes() {}

// 問3 名前を受け取り「greeting、◯◯さん」を返す関数を返す
//     例: makeGreeter("おはよう")("山田") → "おはよう、山田さん"
export function makeGreeter() {}

// 問4 呼ぶたびに 1、2、3… を返す関数を返す
//     例: const next = makeCounter(); next() → 1、next() → 2
export function makeCounter() {}

// 問5 呼ぶたびに start、start + 1、… を返す関数を返す
//     例: const next = makeCounterFrom(10); next() → 10、next() → 11
export function makeCounterFrom() {}

// 問6 呼ぶたびに真偽値を反転し、反転した後の値を返す関数を返す
//     例: const toggle = makeToggle(false); toggle() → true、toggle() → false
export function makeToggle() {}

// 問7 受け取った数を足し続け、それまでの合計を返す関数を返す
//     例: const add = makeAccumulator(); add(5) → 5、add(3) → 8
export function makeAccumulator() {}

// 問8 呼ぶたびに "u1"、"u2"… を返す関数を返す（prefix が "u" のとき）
//     例: const nextId = makeIdMaker("u"); nextId() → "u1"
export function makeIdMaker() {}

// 問9 fn を最初の1回だけ呼び、2回目からは1回目の結果を返す関数を返す
//     例: const get = onlyOnce(() => 42); get() → 42
export function onlyOnce() {}

// 問10 max 回目までは true、それより後は false を返す関数を返す
//     例: const allow = makeLimiter(2); allow() → true、allow() → true、allow() → false
export function makeLimiter() {}

// 問11 { add, list } を返す。add(text) で履歴に足し（何も返さない）、list() でそれまでの履歴の配列（コピー）を返す
//     例: const h = makeHistory(); h.add("a"); h.list() → ["a"]
export function makeHistory() {}

// 問12 { push, pop, size } を返す。push(n) で積み（何も返さない）、pop() で最後に積んだものを取り出して返す（空なら undefined）、size() で数を返す
//     例: const s = makeStack(); s.push(1); s.pop() → 1
export function makeStack() {}

// 問13 { square, computed } を返す。square(n) は n × n を返す。同じ n は2回目から計算しない。computed() は実際に計算した回数を返す
//     例: const c = makeSquareCache(); c.square(3); c.square(3); c.computed() → 1
export function makeSquareCache() {}

// 問14 呼ぶたびに items を先頭から順に返し、最後まで行ったら先頭に戻る関数を返す。空の配列なら Error を投げる
//     例: const next = makeCycler(["a", "b"]); next() → "a"、"b"、"a"…
export function makeCycler() {}

// 問15 { deposit, withdraw, balance } を返す。deposit(n) と withdraw(n) は残高を変えて、変えた後の残高を返す。残高より多く引き出そうとしたら "残高が足りません" の Error を投げる
//     例: const w = makeWallet(1000); w.withdraw(300) → 700
export function makeWallet() {}

// 問16 数を受け取り「数 + unit」の文字列を返す関数を返す
//     例: makeFormatter("kg")(3) → "3kg"
export function makeFormatter() {}

// 問17 数を受け取り、min 以上 max 以下なら true を返す関数を返す
//     例: makeValidator(1, 10)(11) → false
export function makeValidator() {}

// 問18 時刻 t（ミリ秒）を受け取り、前回呼んだときの t との差を返す関数を返す。1回目は t をそのまま返す
//     例: const lap = makeLapTimer(); lap(1000) → 1000、lap(1500) → 500
export function makeLapTimer() {}

// 問19 2つの数を受け取る関数 fn と a を受け取り、b だけを受け取って fn(a, b) を返す関数を返す
//     例: partial((a, b) => a - b, 10)(3) → 7
export function partial() {}

// 問20 文字列を受け取り「<tag>文字列</tag>」を返す関数を返す
//     例: makeTagger("b")("太字") → "<b>太字</b>"
export function makeTagger() {}
