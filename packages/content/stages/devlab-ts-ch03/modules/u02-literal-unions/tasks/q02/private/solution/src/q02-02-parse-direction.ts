// 問2 前後の空白を取り除いて小文字にし、Direction のどれかならそれを返す。違えば undefined
//     例: parseDirection(" UP ") → "up"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Direction 型を使う。

export type Direction = "up" | "down" | "left" | "right";

export function parseDirection(text: string): Direction | undefined {
  const value = text.trim().toLowerCase();
  if (value === "up" || value === "down" || value === "left" || value === "right") {
    return value;
  }
  return undefined;
}
