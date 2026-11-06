// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Box,
  type Cat,
  type Dog,
  type Paper,
  type Product,
  type Robot,
  type Service,
  nameOf,
  nameLength,
  ageNextYear,
  isOlderThan,
  faceArea,
  isSquareShape,
  priceWithTax,
  isFree,
  priceLabel,
  introduce,
  olderName,
  totalPrice,
  namesOf,
  perimeterOf,
  orientation,
  hasLongName,
  averageAge,
  cheapestName,
  sumArea,
  sizeText,
} from "../src/q07-structural-typing.drill";

test("問1 nameOf", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const robot: Robot = { name: "R2", version: 2 };
  expect(nameOf(cat)).toBe("ミケ");
  expect(nameOf(robot)).toBe("R2");
  expectTypeOf(nameOf).parameters.toEqualTypeOf<[{ name: string }]>();
  expectTypeOf(nameOf).returns.toEqualTypeOf<string>();
});

test("問2 nameLength", () => {
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(nameLength(dog)).toBe(2);
  expectTypeOf(nameLength).parameters.toEqualTypeOf<[{ name: string }]>();
  expectTypeOf(nameLength).returns.toEqualTypeOf<number>();
});

test("問3 ageNextYear", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(ageNextYear(cat)).toBe(4);
  expect(ageNextYear(dog)).toBe(6);
  expectTypeOf(ageNextYear).parameters.toEqualTypeOf<[{ age: number }]>();
  expectTypeOf(ageNextYear).returns.toEqualTypeOf<number>();
});

test("問4 isOlderThan", () => {
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(isOlderThan(dog, 3)).toBe(true);
  expect(isOlderThan(dog, 5)).toBe(false);
  expectTypeOf(isOlderThan).parameters.toEqualTypeOf<[{ age: number }, number]>();
  expectTypeOf(isOlderThan).returns.toEqualTypeOf<boolean>();
});

test("問5 faceArea", () => {
  const box: Box = { width: 10, height: 20, depth: 30 };
  const paper: Paper = { width: 210, height: 297 };
  expect(faceArea(box)).toBe(200);
  expect(faceArea(paper)).toBe(62370);
  expectTypeOf(faceArea).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(faceArea).returns.toEqualTypeOf<number>();
});

test("問6 isSquareShape", () => {
  const box: Box = { width: 10, height: 10, depth: 30 };
  const paper: Paper = { width: 210, height: 297 };
  expect(isSquareShape(box)).toBe(true);
  expect(isSquareShape(paper)).toBe(false);
  expectTypeOf(isSquareShape).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(isSquareShape).returns.toEqualTypeOf<boolean>();
});

test("問7 priceWithTax", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(priceWithTax(product)).toBe(165);
  expect(priceWithTax(service)).toBe(3300);
  expectTypeOf(priceWithTax).parameters.toEqualTypeOf<[{ price: number }]>();
  expectTypeOf(priceWithTax).returns.toEqualTypeOf<number>();
});

test("問8 isFree", () => {
  const service: Service = { name: "無料相談", price: 0, hours: 1 };
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  expect(isFree(service)).toBe(true);
  expect(isFree(product)).toBe(false);
  expectTypeOf(isFree).parameters.toEqualTypeOf<[{ price: number }]>();
  expectTypeOf(isFree).returns.toEqualTypeOf<boolean>();
});

test("問9 priceLabel", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(priceLabel(product)).toBe("りんご: 150円");
  expect(priceLabel(service)).toBe("相談: 3000円");
  expectTypeOf(priceLabel).parameters.toEqualTypeOf<[{ name: string; price: number }]>();
  expectTypeOf(priceLabel).returns.toEqualTypeOf<string>();
});

test("問10 introduce", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(introduce(cat)).toBe("ミケ（3歳）");
  expect(introduce(dog)).toBe("ポチ（5歳）");
  expectTypeOf(introduce).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(introduce).returns.toEqualTypeOf<string>();
});

test("問11 olderName", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(olderName(cat, dog)).toBe("ポチ");
  expect(olderName(dog, cat)).toBe("ポチ");
  expectTypeOf(olderName).parameters.toEqualTypeOf<
    [{ name: string; age: number }, { name: string; age: number }]
  >();
  expectTypeOf(olderName).returns.toEqualTypeOf<string>();
});

test("問12 totalPrice", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(totalPrice([product, service])).toBe(3150);
  expect(totalPrice([])).toBe(0);
  expectTypeOf(totalPrice).parameters.toEqualTypeOf<[readonly { price: number }[]]>();
  expectTypeOf(totalPrice).returns.toEqualTypeOf<number>();
});

test("問13 namesOf", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  const robot: Robot = { name: "R2", version: 2 };
  expect(namesOf([cat, dog, robot])).toEqual(["ミケ", "ポチ", "R2"]);
  expectTypeOf(namesOf).parameters.toEqualTypeOf<[readonly { name: string }[]]>();
  expectTypeOf(namesOf).returns.toEqualTypeOf<string[]>();
});

test("問14 perimeterOf", () => {
  const paper: Paper = { width: 3, height: 4 };
  const box: Box = { width: 1, height: 1, depth: 9 };
  expect(perimeterOf(paper)).toBe(14);
  expect(perimeterOf(box)).toBe(4);
  expectTypeOf(perimeterOf).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(perimeterOf).returns.toEqualTypeOf<number>();
});

test("問15 orientation", () => {
  const paper: Paper = { width: 210, height: 297 };
  const box: Box = { width: 30, height: 20, depth: 10 };
  expect(orientation(paper)).toBe("縦長");
  expect(orientation(box)).toBe("横長");
  expect(orientation({ width: 1, height: 1 })).toBe("正方形");
  expectTypeOf(orientation).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(orientation).returns.toEqualTypeOf<"横長" | "縦長" | "正方形">();
});

test("問16 hasLongName", () => {
  const robot: Robot = { name: "R2", version: 2 };
  const product: Product = { name: "ゴールデンデリシャス", price: 300, stock: 1 };
  expect(hasLongName(robot, 3)).toBe(false);
  expect(hasLongName(product, 3)).toBe(true);
  expectTypeOf(hasLongName).parameters.toEqualTypeOf<[{ name: string }, number]>();
  expectTypeOf(hasLongName).returns.toEqualTypeOf<boolean>();
});

test("問17 averageAge", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(averageAge([cat, dog])).toBe(4);
  expect(averageAge([])).toBe(0);
  expectTypeOf(averageAge).parameters.toEqualTypeOf<[readonly { age: number }[]]>();
  expectTypeOf(averageAge).returns.toEqualTypeOf<number>();
});

test("問18 cheapestName", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(cheapestName([service, product])).toBe("りんご");
  expect(() => cheapestName([])).toThrow(Error);
  expectTypeOf(cheapestName).parameters.toEqualTypeOf<
    [readonly { name: string; price: number }[]]
  >();
  expectTypeOf(cheapestName).returns.toEqualTypeOf<string>();
});

test("問19 sumArea", () => {
  const box: Box = { width: 2, height: 3, depth: 4 };
  const paper: Paper = { width: 1, height: 1 };
  expect(sumArea([box, paper])).toBe(7);
  expectTypeOf(sumArea).parameters.toEqualTypeOf<[readonly { width: number; height: number }[]]>();
  expectTypeOf(sumArea).returns.toEqualTypeOf<number>();
});

test("問20 sizeText", () => {
  const paper: Paper = { width: 210, height: 297 };
  expect(sizeText(paper)).toBe("210 × 297");
  expectTypeOf(sizeText).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(sizeText).returns.toEqualTypeOf<string>();
});
