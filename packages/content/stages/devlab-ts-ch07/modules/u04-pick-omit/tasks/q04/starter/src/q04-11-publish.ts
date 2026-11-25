// 問11 下書き Omit<Article, "id" | "publishedAt"> に id と publishedAt を足して Article を作る
//     例: publish(draft, 1, 日時).id → 1
// 引数と戻り値に型注釈を付けます。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

export function publish() {}
