// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  absValue,
  maxOf2,
  passFail,
  bmiLabel,
  ageGroup,
  feeling,
  signText,
  busFare,
  discountRate,
  greetingFor,
  compareText,
  quadrant,
  medalByTime,
  waterState,
  parkingFee,
  windLevel,
  pickLonger,
  parityLabel,
  taxiFare,
  stockStatus,
} from "../src/q01-if-else.drill";

test("問1 absValue", () => {
  expect(absValue(-5)).toBe(5);
  expect(absValue(3)).toBe(3);
  expect(absValue(0)).toBe(0);
  expectTypeOf(absValue).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(absValue).returns.toEqualTypeOf<number>();
});

test("問2 maxOf2", () => {
  expect(maxOf2(3, 8)).toBe(8);
  expect(maxOf2(9, 2)).toBe(9);
  expectTypeOf(maxOf2).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(maxOf2).returns.toEqualTypeOf<number>();
});

test("問3 passFail", () => {
  expect(passFail(60)).toBe("合格");
  expect(passFail(59)).toBe("不合格");
  expectTypeOf(passFail).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(passFail).returns.toEqualTypeOf<"合格" | "不合格">();
});

test("問4 bmiLabel", () => {
  expect(bmiLabel(18)).toBe("やせ");
  expect(bmiLabel(18.5)).toBe("普通");
  expect(bmiLabel(25)).toBe("肥満");
  expectTypeOf(bmiLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(bmiLabel).returns.toEqualTypeOf<"やせ" | "普通" | "肥満">();
});

test("問5 ageGroup", () => {
  expect(ageGroup(17)).toBe("子ども");
  expect(ageGroup(18)).toBe("大人");
  expect(ageGroup(65)).toBe("シニア");
  expectTypeOf(ageGroup).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(ageGroup).returns.toEqualTypeOf<"子ども" | "大人" | "シニア">();
});

test("問6 feeling", () => {
  expect(feeling(14)).toBe("寒い");
  expect(feeling(20)).toBe("ちょうどよい");
  expect(feeling(28)).toBe("暑い");
  expectTypeOf(feeling).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(feeling).returns.toEqualTypeOf<"寒い" | "ちょうどよい" | "暑い">();
});

test("問7 signText", () => {
  expect(signText(3)).toBe("正");
  expect(signText(-2)).toBe("負");
  expect(signText(0)).toBe("ゼロ");
  expectTypeOf(signText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(signText).returns.toEqualTypeOf<"正" | "負" | "ゼロ">();
});

test("問8 busFare", () => {
  expect(busFare(5)).toBe(0);
  expect(busFare(12)).toBe(120);
  expect(busFare(13)).toBe(240);
  expectTypeOf(busFare).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(busFare).returns.toEqualTypeOf<number>();
});

test("問9 discountRate", () => {
  expect(discountRate(10000)).toBe(0.1);
  expect(discountRate(6000)).toBe(0.05);
  expect(discountRate(4999)).toBe(0);
  expectTypeOf(discountRate).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(discountRate).returns.toEqualTypeOf<number>();
});

test("問10 greetingFor", () => {
  expect(greetingFor(5)).toBe("おはよう");
  expect(greetingFor(11)).toBe("こんにちは");
  expect(greetingFor(18)).toBe("こんばんは");
  expect(greetingFor(2)).toBe("こんばんは");
  expectTypeOf(greetingFor).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(greetingFor).returns.toEqualTypeOf<"おはよう" | "こんにちは" | "こんばんは">();
});

test("問11 compareText", () => {
  expect(compareText(3, 2)).toBe("a のほうが大きい");
  expect(compareText(1, 2)).toBe("b のほうが大きい");
  expect(compareText(2, 2)).toBe("同じ");
  expectTypeOf(compareText).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(compareText).returns.toEqualTypeOf<string>();
});

test("問12 quadrant", () => {
  expect(quadrant(1, 2)).toBe(1);
  expect(quadrant(-1, 2)).toBe(2);
  expect(quadrant(-1, -2)).toBe(3);
  expect(quadrant(1, -2)).toBe(4);
  expect(quadrant(0, 5)).toBe(0);
  expectTypeOf(quadrant).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(quadrant).returns.toEqualTypeOf<0 | 1 | 2 | 3 | 4>();
});

test("問13 medalByTime", () => {
  expect(medalByTime(59)).toBe("金");
  expect(medalByTime(75)).toBe("銀");
  expect(medalByTime(119)).toBe("銅");
  expect(medalByTime(120)).toBe("参加賞");
  expectTypeOf(medalByTime).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(medalByTime).returns.toEqualTypeOf<"金" | "銀" | "銅" | "参加賞">();
});

test("問14 waterState", () => {
  expect(waterState(0)).toBe("氷");
  expect(waterState(50)).toBe("水");
  expect(waterState(100)).toBe("水蒸気");
  expectTypeOf(waterState).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(waterState).returns.toEqualTypeOf<"氷" | "水" | "水蒸気">();
});

test("問15 parkingFee", () => {
  expect(parkingFee(30)).toBe(0);
  expect(parkingFee(31)).toBe(400);
  expect(parkingFee(60)).toBe(400);
  expect(parkingFee(61)).toBe(600);
  expectTypeOf(parkingFee).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(parkingFee).returns.toEqualTypeOf<number>();
});

test("問16 windLevel", () => {
  expect(windLevel(4)).toBe("弱い");
  expect(windLevel(7)).toBe("やや強い");
  expect(windLevel(10)).toBe("強い");
  expectTypeOf(windLevel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(windLevel).returns.toEqualTypeOf<"弱い" | "やや強い" | "強い">();
});

test("問17 pickLonger", () => {
  expect(pickLonger("abc", "de")).toBe("abc");
  expect(pickLonger("a", "de")).toBe("de");
  expect(pickLonger("ab", "cd")).toBe("ab");
  expectTypeOf(pickLonger).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(pickLonger).returns.toEqualTypeOf<string>();
});

test("問18 parityLabel", () => {
  expect(parityLabel(4)).toBe("偶数");
  expect(parityLabel(7)).toBe("奇数");
  expectTypeOf(parityLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(parityLabel).returns.toEqualTypeOf<"偶数" | "奇数">();
});

test("問19 taxiFare", () => {
  expect(taxiFare(1000, 23)).toBe(1200);
  expect(taxiFare(1000, 4)).toBe(1200);
  expect(taxiFare(1000, 5)).toBe(1000);
  expect(taxiFare(1000, 21)).toBe(1000);
  expectTypeOf(taxiFare).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(taxiFare).returns.toEqualTypeOf<number>();
});

test("問20 stockStatus", () => {
  expect(stockStatus(0)).toBe("在庫なし");
  expect(stockStatus(5)).toBe("残りわずか");
  expect(stockStatus(6)).toBe("在庫あり");
  expectTypeOf(stockStatus).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(stockStatus).returns.toEqualTypeOf<"在庫あり" | "残りわずか" | "在庫なし">();
});
