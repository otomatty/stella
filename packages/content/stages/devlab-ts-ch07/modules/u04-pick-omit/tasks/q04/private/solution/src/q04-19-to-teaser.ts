// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// 問19
export type Teaser = Pick<Article, "title"> & { excerpt: string };

export function toTeaser(article: Article): Teaser {
  const excerpt = article.body.length > 10 ? `${article.body.slice(0, 10)}…` : article.body;
  return { title: article.title, excerpt };
}
