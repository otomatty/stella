// 問17 型 Draft（{ title: string }）と、型 Published（Draft & { publishedAt: Date }）を定義して export し、publish(draft: Draft, at: Date) を書く。publishedAt を足した Published を返す
//     例: publish({ title: "お知らせ" }, 日時) → { title: "お知らせ", publishedAt: 日時 }
// 引数と戻り値に型注釈を付ける。
// type を使って、& でつないだ型に名前を付ける。

export type Draft = { title: string };
export type Published = Draft & { publishedAt: Date };

export function publish(draft: Draft, at: Date): Published {
  return { ...draft, publishedAt: at };
}
