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

// 問11
export function publish(draft: Omit<Article, "id" | "publishedAt">, id: number, at: Date): Article {
  return { ...draft, id, publishedAt: at };
}
