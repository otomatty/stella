// 問18 型 Tagged を Named & { tags: string[] } として定義して export し、addTag(x: Tagged, tag: string) を書く。tags の末尾に tag を足した、新しい Tagged を返す
//     例: addTag({ name: "メモ", tags: ["a"] }, "b") → { name: "メモ", tags: ["a", "b"] }
// 引数と戻り値に型注釈を付ける。
// type を使って、& でつないだ型に名前を付ける。

export type Named = { name: string };

export type Tagged = Named & { tags: string[] };

export function addTag(x: Tagged, tag: string): Tagged {
  return { ...x, tags: [...x.tags, tag] };
}
