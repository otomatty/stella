// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Student,
  namesOf,
  averageScore,
  bestStudent,
  inGrade,
  passedStudents,
  sortByScore,
  rankLabels,
  groupByGrade,
  countByGrade,
  averageByGrade,
  splitByPass,
  topStudents,
  scoreTable,
  hasPerfect,
  everyonePassed,
  totalScore,
  scoreRange,
  findByName,
  updateScore,
  summaryText,
} from "../src/q10-array-utils.drill";

test("問1 namesOf", () => {
  expect(
    namesOf([
      { name: "山田", grade: 1, score: 80 },
      { name: "佐藤", grade: 2, score: 95 },
    ]),
  ).toEqual(["山田", "佐藤"]);
  expectTypeOf(namesOf).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(namesOf).returns.toEqualTypeOf<string[]>();
});

test("問2 averageScore", () => {
  expect(
    averageScore([
      { name: "山田", grade: 1, score: 80 },
      { name: "佐藤", grade: 2, score: 90 },
    ]),
  ).toBe(85);
  expect(averageScore([])).toBe(0);
  expectTypeOf(averageScore).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(averageScore).returns.toEqualTypeOf<number>();
});

test("問3 bestStudent", () => {
  const a = { name: "山田", grade: 1, score: 80 };
  const b = { name: "佐藤", grade: 2, score: 95 };
  expect(bestStudent([a, b])).toBe(b);
  expect(bestStudent([])).toBeUndefined();
  expectTypeOf(bestStudent).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(bestStudent).returns.toEqualTypeOf<Student | undefined>();
});

test("問4 inGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(inGrade(list, 1).map((s) => s.name)).toEqual(["山田", "鈴木"]);
  expectTypeOf(inGrade).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(inGrade).returns.toEqualTypeOf<Student[]>();
});

test("問5 passedStudents", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(passedStudents(list, 70).map((s) => s.name)).toEqual(["山田"]);
  expectTypeOf(passedStudents).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(passedStudents).returns.toEqualTypeOf<Student[]>();
});

test("問6 sortByScore", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "高橋", grade: 2, score: 80 },
  ];
  expect(sortByScore(list).map((s) => s.name)).toEqual(["佐藤", "山田", "高橋"]);
  expect(list[0]?.name).toBe("山田");
  expectTypeOf(sortByScore).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(sortByScore).returns.toEqualTypeOf<Student[]>();
});

test("問7 rankLabels", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  expect(rankLabels(list)).toEqual(["1位 佐藤", "2位 山田"]);
  expectTypeOf(rankLabels).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(rankLabels).returns.toEqualTypeOf<string[]>();
});

test("問8 groupByGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  const groups = groupByGrade(list);
  expect(groups["1"]?.map((s) => s.name)).toEqual(["山田", "鈴木"]);
  expect(groups["2"]?.map((s) => s.name)).toEqual(["佐藤"]);
  expectTypeOf(groupByGrade).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(groupByGrade).returns.toEqualTypeOf<{ [grade: string]: Student[] }>();
});

test("問9 countByGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(countByGrade(list)).toEqual({ "1": 2, "2": 1 });
  expectTypeOf(countByGrade).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(countByGrade).returns.toEqualTypeOf<{ [grade: string]: number }>();
});

test("問10 averageByGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 61 },
  ];
  expect(averageByGrade(list)).toEqual({ "1": 70.5, "2": 95 });
  expectTypeOf(averageByGrade).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(averageByGrade).returns.toEqualTypeOf<{ [grade: string]: number }>();
});

test("問11 splitByPass", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  const [passed, failed] = splitByPass(list, 70);
  expect(passed.map((s) => s.name)).toEqual(["山田"]);
  expect(failed.map((s) => s.name)).toEqual(["鈴木"]);
  expectTypeOf(splitByPass).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(splitByPass).returns.toEqualTypeOf<[Student[], Student[]]>();
});

test("問12 topStudents", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(topStudents(list, 2).map((s) => s.name)).toEqual(["佐藤", "山田"]);
  expectTypeOf(topStudents).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(topStudents).returns.toEqualTypeOf<Student[]>();
});

test("問13 scoreTable", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  expect(scoreTable(list)).toEqual({ 山田: 80, 佐藤: 95 });
  expectTypeOf(scoreTable).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(scoreTable).returns.toEqualTypeOf<{ [name: string]: number }>();
});

test("問14 hasPerfect", () => {
  expect(hasPerfect([{ name: "山田", grade: 1, score: 100 }])).toBe(true);
  expect(hasPerfect([{ name: "山田", grade: 1, score: 99 }])).toBe(false);
  expectTypeOf(hasPerfect).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(hasPerfect).returns.toEqualTypeOf<boolean>();
});

test("問15 everyonePassed", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(everyonePassed(list, 60)).toBe(true);
  expect(everyonePassed(list, 70)).toBe(false);
  expectTypeOf(everyonePassed).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(everyonePassed).returns.toEqualTypeOf<boolean>();
});

test("問16 totalScore", () => {
  expect(
    totalScore([
      { name: "山田", grade: 1, score: 80 },
      { name: "佐藤", grade: 2, score: 95 },
    ]),
  ).toBe(175);
  expect(totalScore([])).toBe(0);
  expectTypeOf(totalScore).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(totalScore).returns.toEqualTypeOf<number>();
});

test("問17 scoreRange", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(scoreRange(list)).toEqual([60, 95]);
  expect(() => scoreRange([])).toThrow(Error);
  expectTypeOf(scoreRange).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(scoreRange).returns.toEqualTypeOf<[number, number]>();
});

test("問18 findByName", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  expect(findByName(list, "佐藤")?.score).toBe(95);
  expect(findByName(list, "鈴木")).toBeUndefined();
  expectTypeOf(findByName).parameters.toEqualTypeOf<[readonly Student[], string]>();
  expectTypeOf(findByName).returns.toEqualTypeOf<Student | undefined>();
});

test("問19 updateScore", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  const updated = updateScore(list, "山田", 90);
  expect(updated.map((s) => s.score)).toEqual([90, 95]);
  expect(list[0]?.score).toBe(80);
  expectTypeOf(updateScore).parameters.toEqualTypeOf<[readonly Student[], string, number]>();
  expectTypeOf(updateScore).returns.toEqualTypeOf<Student[]>();
});

test("問20 summaryText", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(summaryText(list)).toBe("人数 3、平均 78.3、最高 佐藤（95）");
  expect(summaryText([])).toBe("人数 0");
  expectTypeOf(summaryText).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(summaryText).returns.toEqualTypeOf<string>();
});
