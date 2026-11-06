// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  greetWithTitle,
  fixed,
  nameText,
  repeatOnce,
  countdownFrom,
  cut,
  padTwo,
  priceLabel,
  firstWords,
  makeUser,
  averageOf2,
  tagText,
  isLongEnough,
  logText,
  roundStep,
  ageLabel,
  sumUpTo3,
  buildUrl,
  inRange,
  initialsOf,
} from "../src/q03-optional-params.drill";

test("問1 greetWithTitle", () => {
  expect(greetWithTitle("山田", "部長")).toBe("山田部長");
  expect(greetWithTitle("山田")).toBe("山田さん");
  expectTypeOf(greetWithTitle).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(greetWithTitle).returns.toEqualTypeOf<string>();
});

test("問2 fixed", () => {
  expect(fixed(3.14159, 2)).toBe("3.14");
  expect(fixed(3.6)).toBe("4");
  expectTypeOf(fixed).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(fixed).returns.toEqualTypeOf<string>();
});

test("問3 nameText", () => {
  expect(nameText("山田", "太郎")).toBe("山田 太郎");
  expect(nameText("山田")).toBe("山田");
  expectTypeOf(nameText).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(nameText).returns.toEqualTypeOf<string>();
});

test("問4 repeatOnce", () => {
  expect(repeatOnce("ab")).toBe("ab");
  expect(repeatOnce("ab", 3)).toBe("ababab");
  expectTypeOf(repeatOnce).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(repeatOnce).returns.toEqualTypeOf<string>();
});

test("問5 countdownFrom", () => {
  expect(countdownFrom(3)).toEqual([3, 2, 1]);
  expect(countdownFrom(5, 3)).toEqual([5, 4, 3]);
  expectTypeOf(countdownFrom).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(countdownFrom).returns.toEqualTypeOf<number[]>();
});

test("問6 cut", () => {
  expect(cut("TypeScript入門講座", 6)).toBe("TypeSc…");
  expect(cut("TypeScript入門講座")).toBe("TypeScript…");
  expect(cut("短い")).toBe("短い");
  expectTypeOf(cut).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(cut).returns.toEqualTypeOf<string>();
});

test("問7 padTwo", () => {
  expect(padTwo(5)).toBe("05");
  expect(padTwo(5, 4)).toBe("0005");
  expectTypeOf(padTwo).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(padTwo).returns.toEqualTypeOf<string>();
});

test("問8 priceLabel", () => {
  expect(priceLabel(1200)).toBe("1,200円");
  expect(priceLabel(1200, "ドル")).toBe("1,200ドル");
  expectTypeOf(priceLabel).parameters.toEqualTypeOf<[number, string?]>();
  expectTypeOf(priceLabel).returns.toEqualTypeOf<string>();
});

test("問9 firstWords", () => {
  expect(firstWords("a b c d", 2)).toBe("a b");
  expect(firstWords("a b c d")).toBe("a");
  expectTypeOf(firstWords).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(firstWords).returns.toEqualTypeOf<string>();
});

test("問10 makeUser", () => {
  expect(makeUser("山田", 30)).toStrictEqual({ name: "山田", age: 30 });
  expect(makeUser("山田")).toStrictEqual({ name: "山田" });
  expectTypeOf(makeUser).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(makeUser).returns.toEqualTypeOf<{ name: string; age?: number }>();
});

test("問11 averageOf2", () => {
  expect(averageOf2(4, 6)).toBe(5);
  expect(averageOf2(4)).toBe(4);
  expectTypeOf(averageOf2).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(averageOf2).returns.toEqualTypeOf<number>();
});

test("問12 tagText", () => {
  expect(tagText("重要", "red")).toBe("<重要:red>");
  expect(tagText("メモ")).toBe("<メモ>");
  expectTypeOf(tagText).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(tagText).returns.toEqualTypeOf<string>();
});

test("問13 isLongEnough", () => {
  expect(isLongEnough("abcdefgh")).toBe(true);
  expect(isLongEnough("abc")).toBe(false);
  expect(isLongEnough("abc", 3)).toBe(true);
  expectTypeOf(isLongEnough).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(isLongEnough).returns.toEqualTypeOf<boolean>();
});

test("問14 logText", () => {
  expect(logText("起動")).toBe("[INFO] 起動");
  expect(logText("起動", "warn")).toBe("[WARN] 起動");
  expectTypeOf(logText).parameters.toEqualTypeOf<[string, ("info" | "warn")?]>();
  expectTypeOf(logText).returns.toEqualTypeOf<string>();
});

test("問15 roundStep", () => {
  expect(roundStep(17, 5)).toBe(15);
  expect(roundStep(18, 5)).toBe(20);
  expect(roundStep(2.6)).toBe(3);
  expectTypeOf(roundStep).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(roundStep).returns.toEqualTypeOf<number>();
});

test("問16 ageLabel", () => {
  expect(ageLabel(30)).toBe("30歳");
  expect(ageLabel()).toBe("年齢不明");
  expectTypeOf(ageLabel).parameters.toEqualTypeOf<[number?]>();
  expectTypeOf(ageLabel).returns.toEqualTypeOf<string>();
});

test("問17 sumUpTo3", () => {
  expect(sumUpTo3(1)).toBe(1);
  expect(sumUpTo3(1, 2)).toBe(3);
  expect(sumUpTo3(1, 2, 3)).toBe(6);
  expectTypeOf(sumUpTo3).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(sumUpTo3).returns.toEqualTypeOf<number>();
});

test("問18 buildUrl", () => {
  expect(buildUrl("/search", "q=ts")).toBe("/search?q=ts");
  expect(buildUrl("/home")).toBe("/home");
  expectTypeOf(buildUrl).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(buildUrl).returns.toEqualTypeOf<string>();
});

test("問19 inRange", () => {
  expect(inRange(50)).toBe(true);
  expect(inRange(150)).toBe(false);
  expect(inRange(150, 0, 200)).toBe(true);
  expectTypeOf(inRange).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(inRange).returns.toEqualTypeOf<boolean>();
});

test("問20 initialsOf", () => {
  expect(initialsOf("Taro", "Yamada")).toBe("T.Y");
  expect(initialsOf("Taro")).toBe("T");
  expectTypeOf(initialsOf).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(initialsOf).returns.toEqualTypeOf<string>();
});
