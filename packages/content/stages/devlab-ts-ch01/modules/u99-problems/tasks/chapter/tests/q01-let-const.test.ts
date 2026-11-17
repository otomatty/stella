import { describe, expect, test } from "vitest";
import { checkout } from "../src/q01-let-const";

describe("checkout", () => {
  test("5000円未満なら送料500円を足す", () => {
    expect(checkout(1000, 2, 0)).toBe(2500);
  });

  test("ちょうど5000円なら送料は無料", () => {
    expect(checkout(1000, 5, 0)).toBe(5000);
  });

  test("クーポンを引いた後の金額で送料を決める", () => {
    expect(checkout(1000, 5, 100)).toBe(5400);
    expect(checkout(2500, 3, 1000)).toBe(6500);
  });

  test("クーポンが小計より大きくても0円より小さくしない", () => {
    expect(checkout(100, 1, 500)).toBe(500);
  });
});
