// 02-q05 配列を壊さない操作
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array
//
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

export type Book = {
  title: string;
  price: number;
};

export function addItem() {}

export function removeAt() {}

export function sortByPrice() {}
