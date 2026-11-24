// 問9 反対の方角を返す。"north" と "south"、"east" と "west" が反対
//     例: opposite("east") → "west"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function opposite(
  direction: "north" | "south" | "east" | "west",
): "north" | "south" | "east" | "west" {
  if (direction === "north") {
    return "south";
  }
  if (direction === "south") {
    return "north";
  }
  if (direction === "east") {
    return "west";
  }
  return "east";
}
