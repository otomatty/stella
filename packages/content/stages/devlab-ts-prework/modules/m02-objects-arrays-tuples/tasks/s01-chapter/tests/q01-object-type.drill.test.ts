// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  getName,
  getAge,
  makePoint,
  pointText,
  makeUser,
  isAdultUser,
  bookLabel,
  makeBook,
  subtotal,
  rectArea,
  makeRect,
  fullNameOf,
  makePerson,
  measureText,
  isSameName,
  scoreTotal,
  makeScore,
  colorText,
  makeColor,
  middleOf,
} from "../src/q01-object-type.drill";

test("問1 getName", () => {
  expect(getName({ name: "山田", age: 30 })).toBe("山田");
  expectTypeOf(getName).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(getName).returns.toEqualTypeOf<string>();
});

test("問2 getAge", () => {
  expect(getAge({ name: "山田", age: 30 })).toBe(30);
  expectTypeOf(getAge).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(getAge).returns.toEqualTypeOf<number>();
});

test("問3 makePoint", () => {
  expect(makePoint(1, 2)).toEqual({ x: 1, y: 2 });
  expectTypeOf(makePoint).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(makePoint).returns.toEqualTypeOf<{ x: number; y: number }>();
});

test("問4 pointText", () => {
  expect(pointText({ x: 1, y: 2 })).toBe("(1, 2)");
  expect(pointText({ x: -3, y: 0 })).toBe("(-3, 0)");
  expectTypeOf(pointText).parameters.toEqualTypeOf<[{ x: number; y: number }]>();
  expectTypeOf(pointText).returns.toEqualTypeOf<string>();
});

test("問5 makeUser", () => {
  expect(makeUser("山田", 30)).toEqual({ name: "山田", age: 30 });
  expectTypeOf(makeUser).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makeUser).returns.toEqualTypeOf<{ name: string; age: number }>();
});

test("問6 isAdultUser", () => {
  expect(isAdultUser({ name: "山田", age: 30 })).toBe(true);
  expect(isAdultUser({ name: "佐藤", age: 17 })).toBe(false);
  expectTypeOf(isAdultUser).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(isAdultUser).returns.toEqualTypeOf<boolean>();
});

test("問7 bookLabel", () => {
  expect(bookLabel({ title: "TypeScript入門", price: 2800 })).toBe("TypeScript入門（2,800円）");
  expectTypeOf(bookLabel).parameters.toEqualTypeOf<[{ title: string; price: number }]>();
  expectTypeOf(bookLabel).returns.toEqualTypeOf<string>();
});

test("問8 makeBook", () => {
  expect(makeBook("React入門", 2400)).toEqual({ title: "React入門", price: 2400 });
  expectTypeOf(makeBook).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makeBook).returns.toEqualTypeOf<{ title: string; price: number }>();
});

test("問9 subtotal", () => {
  expect(subtotal({ price: 150, quantity: 3 })).toBe(450);
  expectTypeOf(subtotal).parameters.toEqualTypeOf<[{ price: number; quantity: number }]>();
  expectTypeOf(subtotal).returns.toEqualTypeOf<number>();
});

test("問10 rectArea", () => {
  expect(rectArea({ width: 3, height: 4 })).toBe(12);
  expectTypeOf(rectArea).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(rectArea).returns.toEqualTypeOf<number>();
});

test("問11 makeRect", () => {
  expect(makeRect(3, 4)).toEqual({ width: 3, height: 4 });
  expectTypeOf(makeRect).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(makeRect).returns.toEqualTypeOf<{ width: number; height: number }>();
});

test("問12 fullNameOf", () => {
  expect(fullNameOf({ firstName: "太郎", lastName: "山田" })).toBe("山田 太郎");
  expectTypeOf(fullNameOf).parameters.toEqualTypeOf<[{ firstName: string; lastName: string }]>();
  expectTypeOf(fullNameOf).returns.toEqualTypeOf<string>();
});

test("問13 makePerson", () => {
  expect(makePerson("太郎", "山田")).toEqual({ firstName: "太郎", lastName: "山田" });
  expectTypeOf(makePerson).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(makePerson).returns.toEqualTypeOf<{ firstName: string; lastName: string }>();
});

test("問14 measureText", () => {
  expect(measureText({ value: 25, unit: "℃" })).toBe("25℃");
  expect(measureText({ value: 1.5, unit: "kg" })).toBe("1.5kg");
  expectTypeOf(measureText).parameters.toEqualTypeOf<[{ value: number; unit: string }]>();
  expectTypeOf(measureText).returns.toEqualTypeOf<string>();
});

test("問15 isSameName", () => {
  expect(isSameName({ name: "山田" }, { name: "山田" })).toBe(true);
  expect(isSameName({ name: "山田" }, { name: "佐藤" })).toBe(false);
  expectTypeOf(isSameName).parameters.toEqualTypeOf<[{ name: string }, { name: string }]>();
  expectTypeOf(isSameName).returns.toEqualTypeOf<boolean>();
});

test("問16 scoreTotal", () => {
  expect(scoreTotal({ math: 80, english: 70, science: 90 })).toBe(240);
  expectTypeOf(scoreTotal).parameters.toEqualTypeOf<
    [{ math: number; english: number; science: number }]
  >();
  expectTypeOf(scoreTotal).returns.toEqualTypeOf<number>();
});

test("問17 makeScore", () => {
  expect(makeScore(80, 70, 90)).toEqual({ math: 80, english: 70, science: 90 });
  expectTypeOf(makeScore).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(makeScore).returns.toEqualTypeOf<{
    math: number;
    english: number;
    science: number;
  }>();
});

test("問18 colorText", () => {
  expect(colorText({ r: 255, g: 0, b: 0 })).toBe("rgb(255, 0, 0)");
  expectTypeOf(colorText).parameters.toEqualTypeOf<[{ r: number; g: number; b: number }]>();
  expectTypeOf(colorText).returns.toEqualTypeOf<string>();
});

test("問19 makeColor", () => {
  expect(makeColor(0, 128, 255)).toEqual({ r: 0, g: 128, b: 255 });
  expectTypeOf(makeColor).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(makeColor).returns.toEqualTypeOf<{ r: number; g: number; b: number }>();
});

test("問20 middleOf", () => {
  expect(middleOf({ start: 2, end: 8 })).toBe(5);
  expect(middleOf({ start: 0, end: 1 })).toBe(0.5);
  expectTypeOf(middleOf).parameters.toEqualTypeOf<[{ start: number; end: number }]>();
  expectTypeOf(middleOf).returns.toEqualTypeOf<number>();
});
