// 問5 型 ArticleSummary を、Article から id と title を取り出して作る
// プロパティを手で書き並べず、Pick で型を作ります。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

export type ArticleSummary = Pick<Article, "id" | "title">;
