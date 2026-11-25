// 問16 型 Post を Identified & Timestamped & { title: string } として定義して export し、postTitle(post: Post) を書く。「#1 はじめまして」
//     例: postTitle({ id: 1, createdAt: 日時, title: "はじめまして" }) → "#1 はじめまして"
// 引数と戻り値に型注釈を付ける。
// type を使って、& でつないだ型に名前を付ける。

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

export type Post = Identified & Timestamped & { title: string };

export function postTitle(post: Post): string {
  return `#${post.id} ${post.title}`;
}
