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

// 問15
export type AuthorInfo = Pick<Article, "author"> & { articleCount: number };

export function authorInfo(articles: readonly Article[], author: string): AuthorInfo {
  return { author, articleCount: articles.filter((a) => a.author === author).length };
}
