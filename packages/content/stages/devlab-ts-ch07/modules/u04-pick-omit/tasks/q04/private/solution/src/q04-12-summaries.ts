// 問12 Article の配列を Pick<Article, "id" | "title"> の配列にする
//     例: summaries(articles) → [{ id, title }, …]
// 引数と戻り値に型注釈を付けます。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

export function summaries(articles: readonly Article[]): Pick<Article, "id" | "title">[] {
  return articles.map((a) => ({ id: a.id, title: a.title }));
}
