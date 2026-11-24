// 問18 型 PublicArticle を、Article から body を除いて作る。toPublicArticle(article) で PublicArticle を返す
//     例: toPublicArticle(article) → body のない Article
// 引数と戻り値に型注釈を付けます。
// プロパティを手で書き並べず、Omit で型を作ります。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// ここに型 PublicArticle と関数 toPublicArticle を書く
