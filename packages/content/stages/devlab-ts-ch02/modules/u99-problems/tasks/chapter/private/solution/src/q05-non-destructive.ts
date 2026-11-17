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
