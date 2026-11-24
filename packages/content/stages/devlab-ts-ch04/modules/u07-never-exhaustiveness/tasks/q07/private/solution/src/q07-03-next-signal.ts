// 問3 green → yellow → red → green の順に、次の色を返す
//     例: nextSignal("yellow") → "red"
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Signal = "red" | "yellow" | "green";

export function nextSignal(signal: Signal): Signal {
  switch (signal) {
    case "green":
      return "yellow";
    case "yellow":
      return "red";
    case "red":
      return "green";
    default:
      return assertNever(signal);
  }
}
