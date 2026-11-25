// 問9 照明の状態を「消灯」か「点灯（80%）」で返す
//     例: lightText({ state: "on", brightness: 80 }) → "点灯（80%）"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Light 型を使い、state で状態を見分ける。

export type Light = { state: "off" } | { state: "on"; brightness: number };

export function lightText(light: Light): string {
  return light.state === "off" ? "消灯" : `点灯（${light.brightness}%）`;
}
