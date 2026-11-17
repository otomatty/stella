// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Light = { state: "off" } | { state: "on"; brightness: number };

// 問7
export function turnOff(light: Light): Light {
  return light.state === "on" ? { state: "off" } : light;
}
