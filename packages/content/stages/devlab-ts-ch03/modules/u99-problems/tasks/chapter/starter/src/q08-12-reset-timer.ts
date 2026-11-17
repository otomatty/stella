// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// ドア、照明、タイマー、チケットの状態を表す型は定義済みです。引数と戻り値には型注釈を付けること。
// どの型も、state や status で今の状態を見分ける判別可能なユニオン型になっている。
// 状態を変える関数は、元のオブジェクトを書き換えずに、新しい状態のオブジェクトを返す。今の状態では変えられないときは、受け取った状態をそのまま返す。

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

// 問12 どの状態からでも idle に戻す
//     例: resetTimer({ state: "paused", elapsed: 300 }) → { state: "idle" }
export function resetTimer() {}
