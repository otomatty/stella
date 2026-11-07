// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit
//
// 型 User と Article は定義済みです。
// Pick<T, "a" | "b"> は指定したプロパティだけを取り出した型、Omit<T, "a" | "b"> は指定したプロパティを除いた型。
// 型を書く問題は、プロパティを手で書き並べず、Pick や Omit で作ること。関数は引数と戻り値に型注釈を付けること。
// Omit した型を返す関数は、返すオブジェクトに、除いたプロパティを含めないこと（テストで確かめます）。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// 問11 下書き Omit<Article, "id" | "publishedAt"> に id と publishedAt を足して Article を作る
//     例: publish(draft, 1, 日時).id → 1
export function publish() {}
