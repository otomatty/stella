// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

// 問20
export type Place = Named & { lat: number; lng: number };

export function place(name: string, lat: number, lng: number): Place {
  return { name, lat, lng };
}
