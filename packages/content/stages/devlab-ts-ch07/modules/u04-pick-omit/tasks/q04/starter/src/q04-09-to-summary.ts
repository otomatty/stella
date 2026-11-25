// 問9 Article から { id, title } を取り出して返す
//     例: toSummary(article) → { id: 1, title: "はじめまして" }
// 引数と戻り値に型注釈を付けます。
// 戻り値の型に Pick<Article, "id" | "title"> を使います。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

export function toSummary() {}
