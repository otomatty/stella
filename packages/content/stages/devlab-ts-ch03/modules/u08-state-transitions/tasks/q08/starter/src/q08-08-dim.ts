// 問8 点いている照明の明るさを amount だけ下げる。0 以下になったら消す（off にする）。消えていればそのまま
//     例: dim({ state: "on", brightness: 80 }, 30) → { state: "on", brightness: 50 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Light 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Light = { state: "off" } | { state: "on"; brightness: number };

export function dim() {}
