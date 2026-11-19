import { readFileSync } from "node:fs";
import path from "node:path";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { setupOrder } from "../src/order.js";

beforeEach(() => {
  // 配布された index.html の body を読み込む。script は実行せず setup を呼ぶ。
  const file = path.join(import.meta.dirname, "..", "index.html");
  const html = readFileSync(file, "utf8");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
  setupOrder(document.querySelector("#exercise"));
});

const quantityMessage = "数量は1〜99の整数で入力してください。";

describe("注文フォーム", () => {
  test.each([
    ["1", true, "2100"],
    ["2", true, "3000"],
    ["3", true, "4171"],
    ["3", false, "4501"],
    ["99", false, "148539"],
  ])("数量 %s、会員 %s の合計は %s 円", async (quantity, isMember, total) => {
    const user = userEvent.setup();
    const quantityInput = screen.getByLabelText("数量");
    if (isMember) {
      await user.click(screen.getByRole("checkbox", { name: "会員" }));
    }
    await user.type(quantityInput, quantity);
    await user.click(screen.getByRole("button", { name: "合計を確認" }));

    expect(
      screen.getByRole("status", { name: "注文の合計" }),
    ).toHaveTextContent(new RegExp(`^合計 ${total} 円$`));
    expect(quantityInput).not.toHaveAccessibleDescription();
    expect(quantityInput).not.toHaveAttribute("aria-invalid", "true");
  });

  test.each(["", "   ", "0", "100", "1.5"])(
    "数量 %j は合計を出さずエラーを表示する",
    async (quantity) => {
      const user = userEvent.setup();
      const quantityInput = screen.getByLabelText("数量");
      const button = screen.getByRole("button", { name: "合計を確認" });
      const cancellations = [];
      button.form.addEventListener("submit", (event) => {
        cancellations.push(event.defaultPrevented);
      });

      if (quantity !== "") {
        await user.type(quantityInput, quantity);
      }
      await user.click(button);

      expect(cancellations).toEqual([true]);
      expect(screen.getByText(quantityMessage)).toBeVisible();
      expect(quantityInput).toHaveAccessibleDescription(quantityMessage);
      expect(quantityInput).toHaveAttribute("aria-invalid", "true");
      expect(
        screen.getByRole("status", { name: "注文の合計" }),
      ).toBeEmptyDOMElement();
    },
  );

  test("数量を直してエラーを消し、会員区分を変えると再送信で合計が変わる", async () => {
    const user = userEvent.setup();
    const quantityInput = screen.getByLabelText("数量");
    const member = screen.getByRole("checkbox", { name: "会員" });
    const button = screen.getByRole("button", { name: "合計を確認" });
    const result = screen.getByRole("status", { name: "注文の合計" });

    await user.click(button);
    expect(quantityInput).toHaveAccessibleDescription(quantityMessage);
    await user.type(quantityInput, "3");
    expect(quantityInput).not.toHaveAccessibleDescription();
    expect(quantityInput).not.toHaveAttribute("aria-invalid", "true");
    expect(result).toBeEmptyDOMElement();

    await user.click(button);
    expect(result).toHaveTextContent(/^合計 4501 円$/);
    await user.click(member);
    expect(result).toBeEmptyDOMElement();
    await user.click(button);
    expect(result).toHaveTextContent(/^合計 4171 円$/);

    await user.clear(quantityInput);
    expect(result).toBeEmptyDOMElement();
    await user.click(button);
    expect(quantityInput).toHaveAccessibleDescription(quantityMessage);
    expect(result).toBeEmptyDOMElement();
  });
});
