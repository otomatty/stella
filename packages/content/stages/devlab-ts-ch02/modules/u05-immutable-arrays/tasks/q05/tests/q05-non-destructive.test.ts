import { describe, expect, expectTypeOf, test } from "vitest";
import { type Book, addItem, removeAt, sortByPrice } from "../src/q05-non-destructive";

const shelf = (): Book[] => [
  { title: "TypeScript入門", price: 2800 },
  { title: "React入門", price: 2400 },
  { title: "Git入門", price: 1800 },
  { title: "CSS入門", price: 2400 },
];

describe("addItem", () => {
  test("末尾に足した新しい配列を返し、元の配列は変えない", () => {
    const books = shelf();
    const added = addItem(books, { title: "Node.js入門", price: 3000 });
    expect(added).toHaveLength(5);
    expect(added[4]).toEqual({ title: "Node.js入門", price: 3000 });
    expect(books).toEqual(shelf());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(addItem).parameters.toEqualTypeOf<[readonly Book[], Book]>();
    expectTypeOf(addItem).returns.toEqualTypeOf<Book[]>();
  });
});

describe("removeAt", () => {
  test("index 番目を取り除いた新しい配列を返し、元の配列は変えない", () => {
    const books = shelf();
    expect(removeAt(books, 1).map((book) => book.title)).toEqual([
      "TypeScript入門",
      "Git入門",
      "CSS入門",
    ]);
    expect(removeAt(books, 0)).toHaveLength(3);
    expect(books).toEqual(shelf());
  });

  test("index が範囲外か整数でなければ Error を投げる", () => {
    expect(() => removeAt(shelf(), -1)).toThrow(Error);
    expect(() => removeAt(shelf(), 4)).toThrow(Error);
    expect(() => removeAt(shelf(), 1.5)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(removeAt).parameters.toEqualTypeOf<[readonly Book[], number]>();
    expectTypeOf(removeAt).returns.toEqualTypeOf<Book[]>();
  });
});

describe("sortByPrice", () => {
  test("安い順に並べ、同じ価格は元の順のまま", () => {
    expect(sortByPrice(shelf()).map((book) => book.title)).toEqual([
      "Git入門",
      "React入門",
      "CSS入門",
      "TypeScript入門",
    ]);
  });

  test("元の配列は変えない", () => {
    const books = shelf();
    sortByPrice(books);
    expect(books).toEqual(shelf());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(sortByPrice).parameters.toEqualTypeOf<[readonly Book[]]>();
    expectTypeOf(sortByPrice).returns.toEqualTypeOf<Book[]>();
  });
});
