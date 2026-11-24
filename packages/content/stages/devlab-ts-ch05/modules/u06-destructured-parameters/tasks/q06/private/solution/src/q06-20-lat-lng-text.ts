// 問20 タプル [lat, lng] を「35.68, 139.76」の形にする
//     例: latLngText([35.68, 139.76]) → "35.68, 139.76"
// 引数と戻り値には型注釈を付けてください。
// タプルは引数の位置で分割代入してください。

export function latLngText([lat, lng]: [number, number]): string {
  return `${lat}, ${lng}`;
}
