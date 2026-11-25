// 問15 「090-1234-5678」の形の電話番号の、真ん中の4桁を「****」にする
//     例: maskPhone("090-1234-5678") → "090-****-5678"
// 戻り値には型注釈を付けてください。
// slice が使えます。
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}****${phone.slice(8)}`;
}
