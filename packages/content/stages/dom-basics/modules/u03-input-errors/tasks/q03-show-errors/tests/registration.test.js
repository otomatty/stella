import { readFileSync } from "node:fs";
import path from "node:path";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { setupRegistration } from "../src/registration.js";

beforeEach(() => {
  // 配布された index.html の body を読み込む。script は実行せず setup を呼ぶ。
  const file = path.join(import.meta.dirname, "..", "index.html");
  const html = readFileSync(file, "utf8");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
  setupRegistration(document.querySelector("#exercise"));
});

const nameMessage = "名前を入力してください。";
const emailMessage = "メールアドレスに@を含めてください。";
const peopleMessage = "人数は1〜10の整数で入力してください。";

describe("登録フォーム", () => {
  test("無効な送信を止め、2 回送信しても各欄にエラー文を 1 回だけ表示する", async () => {
    const user = userEvent.setup();
    const name = screen.getByLabelText("名前");
    const email = screen.getByLabelText("メールアドレス");
    const people = screen.getByLabelText("人数");
    const button = screen.getByRole("button", { name: "登録する" });
    const cancellations = [];
    button.form.addEventListener("submit", (event) => {
      cancellations.push(event.defaultPrevented);
    });

    expect(name).not.toHaveAccessibleDescription();
    await user.type(name, "   ");
    await user.click(button);
    await user.click(button);

    expect(cancellations).toEqual([true, true]);
    for (const [input, message] of [
      [name, nameMessage],
      [email, emailMessage],
      [people, peopleMessage],
    ]) {
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(message);
      expect(screen.getAllByText(message, { exact: true })).toHaveLength(1);
      const error = document.getElementById(
        input.getAttribute("aria-describedby"),
      );
      expect(error.textContent).toBe(message);
    }
    expect(
      screen.getByRole("status", { name: "登録結果" }),
    ).toBeEmptyDOMElement();
  });

  test("名前を直したときだけ名前欄のエラーが消え、ほかの欄は残る", async () => {
    const user = userEvent.setup();
    const name = screen.getByLabelText("名前");
    const email = screen.getByLabelText("メールアドレス");
    const people = screen.getByLabelText("人数");
    await user.click(screen.getByRole("button", { name: "登録する" }));
    const descriptionId = name.getAttribute("aria-describedby");

    await user.type(name, "   ");
    expect(name).toHaveAccessibleDescription(nameMessage);
    expect(name).toHaveAttribute("aria-invalid", "true");

    await user.type(name, "佐藤");
    expect(name).not.toHaveAccessibleDescription();
    expect(name).not.toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", descriptionId);
    expect(screen.queryByText(nameMessage)).not.toBeInTheDocument();
    expect(email).toHaveAccessibleDescription(emailMessage);
    expect(people).toHaveAccessibleDescription(peopleMessage);
  });

  test("未送信の入力ではエラーを出さず、人数の下限と上限で登録できる", async () => {
    const user = userEvent.setup();
    const email = screen.getByLabelText("メールアドレス");
    const people = screen.getByLabelText("人数");
    const result = screen.getByRole("status", { name: "登録結果" });

    await user.type(screen.getByLabelText("名前"), " 佐藤 ");
    await user.type(email, "sato.example.com");
    expect(email).not.toHaveAccessibleDescription();
    expect(email).not.toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "登録する" }));
    expect(email).toHaveAccessibleDescription(emailMessage);
    expect(email).toHaveAttribute("aria-invalid", "true");
    await user.clear(email);
    expect(email).toHaveAccessibleDescription(emailMessage);
    await user.type(email, "sato@example.com");
    expect(email).not.toHaveAccessibleDescription();
    expect(email).not.toHaveAttribute("aria-invalid", "true");

    await user.type(people, "1{Enter}");
    expect(result).toHaveTextContent(/^登録が完了しました。$/);
    expect(people).not.toHaveAccessibleDescription();
    await user.clear(people);
    expect(result).toBeEmptyDOMElement();
    await user.type(people, "10{Enter}");
    expect(result).toHaveTextContent(/^登録が完了しました。$/);
    expect(people).not.toHaveAttribute("aria-invalid", "true");
  });

  test.each(["0", "11", "1.5"])(
    "人数 %s は無効として扱い、有効に直すと消える",
    async (count) => {
      const user = userEvent.setup();
      const people = screen.getByLabelText("人数");
      const result = screen.getByRole("status", { name: "登録結果" });
      await user.type(screen.getByLabelText("名前"), "佐藤");
      await user.type(
        screen.getByLabelText("メールアドレス"),
        "sato@example.com",
      );
      await user.type(people, count);
      const button = screen.getByRole("button", { name: "登録する" });
      await user.click(button);

      expect(people).toHaveAccessibleDescription(peopleMessage);
      expect(people).toHaveAttribute("aria-invalid", "true");
      expect(result).toBeEmptyDOMElement();

      await user.clear(people);
      await user.type(people, "2");
      expect(people).not.toHaveAccessibleDescription();
      expect(people).not.toHaveAttribute("aria-invalid", "true");
      expect(result).toBeEmptyDOMElement();
      await user.click(button);
      expect(result).toHaveTextContent(/^登録が完了しました。$/);
    },
  );
});
