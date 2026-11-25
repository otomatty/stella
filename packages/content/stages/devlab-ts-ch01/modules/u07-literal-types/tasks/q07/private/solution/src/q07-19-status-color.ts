// 問19 在席ステータスから色を返す。"online" は "green"、"busy" は "red"、"offline" は "gray"
//     例: statusColor("busy") → "red"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function statusColor(status: "online" | "busy" | "offline"): "green" | "red" | "gray" {
  if (status === "online") {
    return "green";
  }
  if (status === "busy") {
    return "red";
  }
  return "gray";
}
