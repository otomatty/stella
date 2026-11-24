// 問15 型 AuthorInfo を Pick<Article, "author"> & { articleCount: number } として作り、authorInfo(articles, author) でその人の記事の数を返す
//     例: authorInfo(articles, "山田") → { author: "山田", articleCount: 2 }
// 引数と戻り値に型注釈を付けます。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// ここに型 AuthorInfo と関数 authorInfo を書く
