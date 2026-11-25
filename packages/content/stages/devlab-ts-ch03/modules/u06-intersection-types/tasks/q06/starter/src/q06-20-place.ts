// 問20 型 Place を Named & { lat: number; lng: number } として定義して export し、place(name: string, lat: number, lng: number) を書く。Place を返す
//     例: place("東京駅", 35.68, 139.76) → { name: "東京駅", lat: 35.68, lng: 139.76 }
// 引数と戻り値に型注釈を付ける。
// type を使って、& でつないだ型に名前を付ける。

export type Named = { name: string };

// ここに型 Place と関数 place を書く
