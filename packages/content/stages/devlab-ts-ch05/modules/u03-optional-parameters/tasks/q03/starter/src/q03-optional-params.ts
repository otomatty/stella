// 05-q03 オプション引数
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters
//
// 問題
// 省略できる引数（オプション引数。name?: string のように ? を付ける）を使って、次の3つの関数を書いてください。
// 引数と戻り値には型注釈を付けること。省略された引数の値は undefined になる。
//
// 1. greet(name, title?)
//    title があれば "山田部長、こんにちは"、なければ "山田さん、こんにちは"
//
// 2. formatName(last, first?, middle?)
//    渡された部分だけを半角スペースでつなぐ。順番は last、middle、first
//    例: formatName("Kennedy", "John", "F") → "Kennedy F John"、formatName("山田") → "山田"
//
// 3. createTag(name, color?)
//    { name, color } を返す。color がなければ "gray"
//
// 説明すること（答えは、この下に // のコメントで書く）
// - オプション引数を、必須の引数より前に置けない理由

export function greet() {}

export function formatName() {}

export function createTag() {}
