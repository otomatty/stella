export type Book = {
  title: string;
  author: string;
  price: number;
};

export function describeBook(book: Book): string {
  return `『${book.title}』${book.author}（${book.price.toLocaleString("ja-JP")}円）`;
}

export function createBook(title: string, author: string, price: number): Book {
  return { title, author, price };
}
