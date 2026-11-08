// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Light = { state: "off" } | { state: "on"; brightness: number };

// 問9
export function lightText(light: Light): string {
  return light.state === "off" ? "消灯" : `点灯（${light.brightness}%）`;
}
