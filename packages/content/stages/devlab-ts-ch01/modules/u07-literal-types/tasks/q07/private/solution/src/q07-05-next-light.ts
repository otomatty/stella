// 問5 信号の次の色を返す。"green" → "yellow" → "red" → "green"
//     例: nextLight("red") → "green"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function nextLight(light: "green" | "yellow" | "red"): "green" | "yellow" | "red" {
  if (light === "green") {
    return "yellow";
  }
  if (light === "yellow") {
    return "red";
  }
  return "green";
}
