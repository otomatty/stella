import { describe, expect, it } from "vitest";
import { parseCompareArgs } from "./ai-review-compare.js";

describe("モデル比較の API 呼び出しの上限", () => {
  const args = ["--provider", "openai", "--model", "selected-model"];
  it("既定では API を呼ばず、少数の入力を検査する", () => {
    expect(parseCompareArgs(args)).toMatchObject({ run: false, remote: false, limit: 10 });
  });
  it("実際の呼び出しには明示した件数が必要", () => {
    expect(() => parseCompareArgs([...args, "--run"])).toThrow(/--limit/);
    expect(parseCompareArgs([...args, "--run", "--limit", "2"])).toMatchObject({
      run: true,
      limit: 2,
    });
  });
  it.each(["0", "-1", "51", "1.5", "NaN"])("不正な件数 %s は受け付けない", (value) => {
    expect(() => parseCompareArgs([...args, "--limit", value])).toThrow(/--limit/);
  });
  it("接続先・モデルの省略や誤記、未知のオプションを受け付けない", () => {
    expect(() => parseCompareArgs([])).toThrow(/--provider/);
    expect(() => parseCompareArgs(["--provider", "openai"])).toThrow(/--model/);
    expect(() => parseCompareArgs([...args, "--provider", "opneai"])).toThrow(/--provider/);
    expect(() => parseCompareArgs([...args, "--runs"])).toThrow();
  });
});
