// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  lengthOf,
  toUpper,
  firstThree,
  lastChar,
  hasWord,
  isHashtag,
  isPng,
  padId,
  normalize,
  snakeSpaces,
  atPosition,
  capitalize,
  surround,
  isPalindrome,
  maskPhone,
  extension,
  clockText,
  removeVowels,
  charAtOrEmpty,
  sameIgnoringCase,
} from "../src/q05-string.drill";

test("問1 lengthOf", () => {
  expect(lengthOf("Agora")).toBe(5);
  expect(lengthOf("")).toBe(0);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<number>();
});

test("問2 toUpper", () => {
  expect(toUpper("abc")).toBe("ABC");
  expect(toUpper("Type1")).toBe("TYPE1");
  expectTypeOf(toUpper).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toUpper).returns.toEqualTypeOf<string>();
});

test("問3 firstThree", () => {
  expect(firstThree("TypeScript")).toBe("Typ");
  expect(firstThree("ab")).toBe("ab");
  expectTypeOf(firstThree).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstThree).returns.toEqualTypeOf<string>();
});

test("問4 lastChar", () => {
  expect(lastChar("hello")).toBe("o");
  expect(lastChar("")).toBe("");
  expectTypeOf(lastChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lastChar).returns.toEqualTypeOf<string>();
});

test("問5 hasWord", () => {
  expect(hasWord("I like TypeScript", "Type")).toBe(true);
  expect(hasWord("I like TypeScript", "Java")).toBe(false);
  expectTypeOf(hasWord).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(hasWord).returns.toEqualTypeOf<boolean>();
});

test("問6 isHashtag", () => {
  expect(isHashtag("#agora")).toBe(true);
  expect(isHashtag("agora#")).toBe(false);
  expectTypeOf(isHashtag).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isHashtag).returns.toEqualTypeOf<boolean>();
});

test("問7 isPng", () => {
  expect(isPng("photo.png")).toBe(true);
  expect(isPng("photo.PNG")).toBe(true);
  expect(isPng("photo.jpg")).toBe(false);
  expectTypeOf(isPng).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isPng).returns.toEqualTypeOf<boolean>();
});

test("問8 padId", () => {
  expect(padId(7)).toBe("0007");
  expect(padId(1234)).toBe("1234");
  expectTypeOf(padId).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(padId).returns.toEqualTypeOf<string>();
});

test("問9 normalize", () => {
  expect(normalize("  Hello ")).toBe("hello");
  expect(normalize("ABC")).toBe("abc");
  expectTypeOf(normalize).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(normalize).returns.toEqualTypeOf<string>();
});

test("問10 snakeSpaces", () => {
  expect(snakeSpaces("a b c")).toBe("a_b_c");
  expect(snakeSpaces("abc")).toBe("abc");
  expectTypeOf(snakeSpaces).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(snakeSpaces).returns.toEqualTypeOf<string>();
});

test("問11 atPosition", () => {
  expect(atPosition("taro@example.com")).toBe(4);
  expect(atPosition("example.com")).toBe(-1);
  expectTypeOf(atPosition).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(atPosition).returns.toEqualTypeOf<number>();
});

test("問12 capitalize", () => {
  expect(capitalize("hello")).toBe("Hello");
  expect(capitalize("a")).toBe("A");
  expect(capitalize("")).toBe("");
  expectTypeOf(capitalize).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(capitalize).returns.toEqualTypeOf<string>();
});

test("問13 surround", () => {
  expect(surround("注意", "**")).toBe("**注意**");
  expect(surround("x", "")).toBe("x");
  expectTypeOf(surround).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(surround).returns.toEqualTypeOf<string>();
});

test("問14 isPalindrome", () => {
  expect(isPalindrome("level")).toBe(true);
  expect(isPalindrome("しんぶんし")).toBe(true);
  expect(isPalindrome("agora")).toBe(false);
  expectTypeOf(isPalindrome).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isPalindrome).returns.toEqualTypeOf<boolean>();
});

test("問15 maskPhone", () => {
  expect(maskPhone("090-1234-5678")).toBe("090-****-5678");
  expect(maskPhone("080-0000-1111")).toBe("080-****-1111");
  expectTypeOf(maskPhone).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(maskPhone).returns.toEqualTypeOf<string>();
});

test("問16 extension", () => {
  expect(extension("photo.jpeg")).toBe("jpeg");
  expect(extension("archive.tar.gz")).toBe("gz");
  expect(extension("README")).toBe("");
  expectTypeOf(extension).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(extension).returns.toEqualTypeOf<string>();
});

test("問17 clockText", () => {
  expect(clockText(9, 5)).toBe("09:05");
  expect(clockText(23, 59)).toBe("23:59");
  expectTypeOf(clockText).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(clockText).returns.toEqualTypeOf<string>();
});

test("問18 removeVowels", () => {
  expect(removeVowels("typescript")).toBe("typscrpt");
  expect(removeVowels("aeiou")).toBe("");
  expectTypeOf(removeVowels).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(removeVowels).returns.toEqualTypeOf<string>();
});

test("問19 charAtOrEmpty", () => {
  expect(charAtOrEmpty("abc", 1)).toBe("b");
  expect(charAtOrEmpty("abc", 5)).toBe("");
  expectTypeOf(charAtOrEmpty).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(charAtOrEmpty).returns.toEqualTypeOf<string>();
});

test("問20 sameIgnoringCase", () => {
  expect(sameIgnoringCase("Agora", "AGORA")).toBe(true);
  expect(sameIgnoringCase("Agora", "Agola")).toBe(false);
  expectTypeOf(sameIgnoringCase).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(sameIgnoringCase).returns.toEqualTypeOf<boolean>();
});
