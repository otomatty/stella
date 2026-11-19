import { readFileSync } from "node:fs";
import path from "node:path";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { setupPreview } from "../src/preview.js";
import {
  validateConfirmation,
  validateEmail,
  validateLength,
  validatePostalCode,
  validateQuantity,
  validateRequired,
} from "../src/validators.js";

beforeEach(() => {
  // 配布された index.html の body を読み込む。script は実行せず setup を呼ぶ。
  const file = path.join(import.meta.dirname, "..", "index.html");
  const html = readFileSync(file, "utf8");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
  setupPreview(document.querySelector("#exercise"));
});

describe("値からエラー文を返す検証関数", () => {
  test("必須は空欄や空白だけを無効とする", () => {
    expect(validateRequired("")).toBe("入力してください。");
    expect(validateRequired("  \t ")).toBe("入力してください。");
    expect(validateRequired(" 佐藤 ")).toBe("");
  });

  test("最大文字数は空欄、上限の直前・ちょうど・直後で判定する", () => {
    expect(validateLength("")).toBe("");
    expect(validateLength("012345678")).toBe("");
    expect(validateLength("0123456789")).toBe("");
    expect(validateLength("0123456789 ")).toBe(
      "10文字以内で入力してください。",
    );
  });

  test.each(["1", "5", "10", " 10 "])("数量 %j は有効", (value) => {
    expect(validateQuantity(value)).toBe("");
  });

  test.each(["", "   ", "0", "11", "2.5", "2個"])("数量 %j は無効", (value) => {
    expect(validateQuantity(value)).toBe(
      "数量は1〜10の整数で入力してください。",
    );
  });

  test("メールは @ の有無だけを調べる", () => {
    expect(validateEmail("a@example.com")).toBe("");
    expect(validateEmail("@")).toBe("");
    expect(validateEmail("a.example.com")).toBe(
      "メールアドレスに@を含めてください。",
    );
    expect(validateEmail("")).toBe("メールアドレスに@を含めてください。");
  });

  test("確認用の入力は大文字小文字や空白を含めて一致するかを調べる", () => {
    expect(validateConfirmation("AB", "AB")).toBe("");
    expect(validateConfirmation("", "")).toBe("");
    expect(validateConfirmation("AB", "ab")).toBe(
      "確認用の入力が一致しません。",
    );
    expect(validateConfirmation("AB", "AB ")).toBe(
      "確認用の入力が一致しません。",
    );
  });

  test("郵便番号は先頭の 0 を含めた半角数字 7 桁だけを通す", () => {
    expect(validatePostalCode("0123456")).toBe("");
    for (const value of [
      "",
      "   ",
      "012345",
      "01234567",
      "012-3456",
      "０１２３４５６",
      "0123456\n",
    ]) {
      expect(validatePostalCode(value)).toBe(
        "郵便番号は半角数字7桁で入力してください。",
      );
    }
  });
});

test("確認フォームで必須入力のエラー文と成功を試せる", async () => {
  const user = userEvent.setup();
  const name = screen.getByLabelText("名前");
  const button = screen.getByRole("button", { name: "必須入力を確認" });
  const result = screen.getByRole("status", { name: "検証結果" });
  await user.click(button);
  expect(name).toHaveAccessibleDescription("入力してください。");
  expect(result).toBeEmptyDOMElement();

  await user.type(name, " 佐藤 ");
  await user.click(button);
  expect(name).not.toHaveAccessibleDescription();
  expect(result).toHaveTextContent(/^入力を確認しました。$/);
});
