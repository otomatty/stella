import { expect, test } from "vitest";
import { validateDays } from "../src/rental-days.js";

test.each(["2", "7", "14"])("貸出日数 %s を受け付ける", (value) => {
  expect(validateDays(value)).toBe("");
});

test.each(["", "   ", "1", "15", "2.5", "二日"])(
  "無効な貸出日数 %s にエラー文を返す",
  (value) => {
    expect(validateDays(value)).toBe(
      "貸出日数は2〜14の整数で入力してください。",
    );
  },
);
