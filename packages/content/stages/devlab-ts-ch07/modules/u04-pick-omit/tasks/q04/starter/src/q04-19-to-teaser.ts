// 問19 型 Teaser を Pick<Article, "title"> & { excerpt: string } として作る。toTeaser(article) の excerpt は body の先頭10文字（10文字を超えるときは「…」を付ける）
//     例: toTeaser(本文が「TypeScriptを始めよう」の記事).excerpt → "TypeScript…"
// 引数と戻り値に型注釈を付けます。

export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// ここに型 Teaser と関数 toTeaser を書く
