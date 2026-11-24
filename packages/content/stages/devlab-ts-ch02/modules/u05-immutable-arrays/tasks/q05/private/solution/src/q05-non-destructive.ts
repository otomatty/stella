// 問題
// 本を表す型 Book は定義済みです。次の3つの関数を書いてください。
// どの関数も、引数の配列は readonly Book[] にし、元の配列を変えずに新しい配列を返すこと。
//
// 1. addItem(books, book)
//    末尾に book を足した新しい配列を返す
//
// 2. removeAt(books, index)
//    index 番目の要素を取り除いた新しい配列を返す。
//    index が 0 未満、books の長さ以上、または整数でないときは Error を投げる
//
// 3. sortByPrice(books)
//    価格の安い順に並べた新しい配列を返す。同じ価格なら元の順のまま
//
// 説明すること（答えは、この下に // のコメントで書く）
// - readonly Book[] の引数に対して books.sort() を呼ぶと、どうなるか。それはなぜか

// readonly Book[] には sort のような配列を書き換えるメソッドがないので、books.sort() は型エラーになる
export type Book = {
  title: string;
  price: number;
};

export function addItem(books: readonly Book[], book: Book): Book[] {
  return [...books, book];
}

export function removeAt(books: readonly Book[], index: number): Book[] {
  if (!Number.isInteger(index) || index < 0 || index >= books.length) {
    throw new Error("index が範囲外です");
  }
  return [...books.slice(0, index), ...books.slice(index + 1)];
}

export function sortByPrice(books: readonly Book[]): Book[] {
  return [...books].sort((a, b) => a.price - b.price);
}
