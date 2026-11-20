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

// 問18
export type PublicArticle = Omit<Article, "body">;

export function toPublicArticle(article: Article): PublicArticle {
  return {
    id: article.id,
    title: article.title,
    author: article.author,
    publishedAt: article.publishedAt,
  };
}
