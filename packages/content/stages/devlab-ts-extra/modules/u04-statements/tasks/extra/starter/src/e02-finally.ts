// 04-e02 発展問題 finally
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//
// 問題
// try-catch に finally を付けると、例外が出ても出なくても、最後に必ず実行される処理を書けます。
// ファイルを開いたら必ず閉じる、のような「後片付け」に使います。
//
// processAll(inputs) を書いてください。引数は readonly string[]。
// それぞれの文字列を JSON.parse で読み、結果が数値なら合計に足す。
// - 読めたが数値でなければ、"数値ではありません: <input>" の Error を投げ、それを catch して、その message を errors に足す
// - JSON として読めなければ、"読めません: <input>" を errors に足す
// - 成功しても失敗しても、finally で log に "done: <input>" を足す
// 戻り値は { total: number; errors: string[]; log: string[] }
//
// 例: processAll(["1", "x", '"a"', "2"])
//     → { total: 3,
//         errors: ["読めません: x", '数値ではありません: "a"'],
//         log: ["done: 1", "done: x", 'done: "a"', "done: 2"] }

export function processAll() {}
