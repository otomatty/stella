import { describe, expect, it } from "vitest";
import { checkSolutionLeak } from "./solution-leak.js";

const solution = [
  [
    "export function totalPrice(items) {",
    "  return items.filter((item) => item.inStock).reduce((sum, item) => sum + item.price, 0);",
    "}",
  ].join("\n"),
];
const submission = [
  [
    "export function totalPrice(items) {",
    "  let sum = 0;",
    "  for (const item of items) if (item.inStock) sum += item.price;",
    "  return sum;",
    "}",
  ].join("\n"),
];

describe("返信と解答例の照合", () => {
  it("解答例にしかないコードが返信に入っていたら当てる", () => {
    const result = checkSolutionLeak({
      texts: [
        "よく書けています。",
        "次は `items.filter((item) => item.inStock).reduce((sum, item) => sum + item.price, 0)` と書けます。",
      ],
      solution,
      known: submission,
      strict: false,
    });
    expect(result.hits).toEqual([1]);
    expect(result.fragments.length).toBeGreaterThan(0);
  });
  it("受講者自身のコードや配布物の引用は漏洩にしない", () => {
    const result = checkSolutionLeak({
      texts: ["`export function totalPrice(items) {` の名前が戻り値を表しています。"],
      solution,
      known: submission,
      strict: true,
    });
    expect(result.hits).toEqual([]);
  });
  it("確認A・Bは短い断片でも当てる", () => {
    const fragment = "`reduce((sum, item)` を使う手もあります。";
    expect(
      checkSolutionLeak({ texts: [fragment], solution, known: submission, strict: false }).hits,
    ).toEqual([]);
    expect(
      checkSolutionLeak({ texts: [fragment], solution, known: submission, strict: true }).hits,
    ).toEqual([0]);
  });
  it("記号だけの並びの偶然の一致では当てない", () => {
    const result = checkSolutionLeak({
      texts: ["( ( ) => ) ; } ) ; ( ( ) )"],
      solution: ["((() => {}));(());"],
      known: [],
      strict: true,
    });
    expect(result.hits).toEqual([]);
  });
});
