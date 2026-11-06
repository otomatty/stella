// このファイルは書き換えないでください
import { expect, test } from "vitest";
import {
  addTax,
  splitBill,
  minutesToText,
  average3,
  sumTo,
  factorial,
  countDown,
  power,
  countChar,
  reverseText,
  digitSum,
  fizzBuzz,
  compound,
  maxOf3,
  shippingFee,
  countVowels,
  collatzSteps,
  gcd,
  fibonacci,
  secondsToClock,
} from "../src/q01-let-const.drill";

test("問1 addTax", () => {
  expect(addTax(1000)).toBe(1100);
  expect(addTax(980)).toBe(1078);
  expect(addTax(5)).toBe(5);
});

test("問2 splitBill", () => {
  expect(splitBill(10000, 3)).toBe(3400);
  expect(splitBill(9000, 3)).toBe(3000);
  expect(splitBill(1000, 4)).toBe(300);
});

test("問3 minutesToText", () => {
  expect(minutesToText(125)).toBe("2時間5分");
  expect(minutesToText(60)).toBe("1時間0分");
  expect(minutesToText(45)).toBe("0時間45分");
});

test("問4 average3", () => {
  expect(average3(1, 2, 6)).toBe(3);
  expect(average3(10, 20, 30)).toBe(20);
});

test("問5 sumTo", () => {
  expect(sumTo(10)).toBe(55);
  expect(sumTo(1)).toBe(1);
  expect(sumTo(0)).toBe(0);
});

test("問6 factorial", () => {
  expect(factorial(5)).toBe(120);
  expect(factorial(1)).toBe(1);
  expect(factorial(0)).toBe(1);
});

test("問7 countDown", () => {
  expect(countDown(3)).toBe("3, 2, 1, 発射");
  expect(countDown(1)).toBe("1, 発射");
  expect(countDown(0)).toBe("発射");
});

test("問8 power", () => {
  expect(power(2, 10)).toBe(1024);
  expect(power(5, 0)).toBe(1);
  expect(power(3, 3)).toBe(27);
});

test("問9 countChar", () => {
  expect(countChar("banana", "a")).toBe(3);
  expect(countChar("banana", "z")).toBe(0);
  expect(countChar("", "a")).toBe(0);
});

test("問10 reverseText", () => {
  expect(reverseText("abc")).toBe("cba");
  expect(reverseText("あいう")).toBe("ういあ");
  expect(reverseText("")).toBe("");
});

test("問11 digitSum", () => {
  expect(digitSum(1234)).toBe(10);
  expect(digitSum(9)).toBe(9);
  expect(digitSum(0)).toBe(0);
});

test("問12 fizzBuzz", () => {
  expect(fizzBuzz(15)).toBe("FizzBuzz");
  expect(fizzBuzz(9)).toBe("Fizz");
  expect(fizzBuzz(10)).toBe("Buzz");
  expect(fizzBuzz(7)).toBe("7");
});

test("問13 compound", () => {
  expect(compound(10000, 10, 2)).toBe(12100);
  expect(compound(10000, 5, 3)).toBe(11576);
  expect(compound(10000, 5, 0)).toBe(10000);
});

test("問14 maxOf3", () => {
  expect(maxOf3(3, 9, 2)).toBe(9);
  expect(maxOf3(7, 1, 5)).toBe(7);
  expect(maxOf3(-3, -2, -1)).toBe(-1);
});

test("問15 shippingFee", () => {
  expect(shippingFee(2000, false)).toBe(500);
  expect(shippingFee(3000, false)).toBe(0);
  expect(shippingFee(100, true)).toBe(0);
});

test("問16 countVowels", () => {
  expect(countVowels("education")).toBe(5);
  expect(countVowels("rhythm")).toBe(0);
  expect(countVowels("")).toBe(0);
});

test("問17 collatzSteps", () => {
  expect(collatzSteps(6)).toBe(8);
  expect(collatzSteps(1)).toBe(0);
  expect(collatzSteps(7)).toBe(16);
});

test("問18 gcd", () => {
  expect(gcd(12, 18)).toBe(6);
  expect(gcd(7, 5)).toBe(1);
  expect(gcd(100, 25)).toBe(25);
});

test("問19 fibonacci", () => {
  expect(fibonacci(10)).toBe(55);
  expect(fibonacci(0)).toBe(0);
  expect(fibonacci(1)).toBe(1);
  expect(fibonacci(2)).toBe(1);
});

test("問20 secondsToClock", () => {
  expect(secondsToClock(3723)).toBe("01:02:03");
  expect(secondsToClock(59)).toBe("00:00:59");
  expect(secondsToClock(36000)).toBe("10:00:00");
});
