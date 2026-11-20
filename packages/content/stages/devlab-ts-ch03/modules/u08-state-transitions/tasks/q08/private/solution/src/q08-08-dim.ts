// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Light = { state: "off" } | { state: "on"; brightness: number };

// 問8
export function dim(light: Light, amount: number): Light {
  if (light.state === "off") {
    return light;
  }
  const brightness = light.brightness - amount;
  return brightness <= 0 ? { state: "off" } : { state: "on", brightness };
}
