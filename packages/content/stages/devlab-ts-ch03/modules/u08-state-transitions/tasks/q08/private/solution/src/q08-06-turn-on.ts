// 問6 消えている照明を明るさ 100 で点ける。点いていればそのまま
//     例: turnOn({ state: "off" }) → { state: "on", brightness: 100 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Light 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Light = { state: "off" } | { state: "on"; brightness: number };

export function turnOn(light: Light): Light {
  return light.state === "off" ? { state: "on", brightness: 100 } : light;
}
