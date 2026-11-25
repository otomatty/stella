// 問13 { city, building? } を、building があれば「city building」、なければ「city」にする
//     例: addressText({ city: "渋谷区", building: "渋谷ビル" }) → "渋谷区 渋谷ビル"
// 引数と戻り値には型注釈を付けます。
// 値が省略されたかどうかは undefined と比較して確かめます。
export function addressText(address: { city: string; building?: string }): string {
  return address.building === undefined ? address.city : `${address.city} ${address.building}`;
}
