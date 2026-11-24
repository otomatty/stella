// 問6 型 ArticleDraft を、Article から id と publishedAt を除いて作る
// プロパティを手で書き並べず、Omit で型を作ります。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// ここに型 ArticleDraft を書く
