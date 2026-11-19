import { readFileSync } from "node:fs";
import path from "node:path";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { setupInputs } from "../src/inputs.js";

beforeEach(() => {
  // 配布された index.html の body を読み込む。script は実行せず setup を呼ぶ。
  const file = path.join(import.meta.dirname, "..", "index.html");
  const html = readFileSync(file, "utf8");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
  setupInputs(document.querySelector("#exercise"));
});

describe("入力を読んで表示を更新する", () => {
  test("名前の前後の空白を除き、途中の空白を残す。空白だけにすると消える", async () => {
    const user = userEvent.setup();
    const name = screen.getByLabelText("名前");
    const button = screen.getByRole("button", { name: "あいさつを表示" });
    const greeting = screen.getByRole("status", { name: "あいさつ" });
    expect(greeting).toBeEmptyDOMElement();

    await user.type(name, "  山田 太郎  {Enter}");
    expect(greeting).toHaveTextContent(/^こんにちは、山田 太郎さん。$/);

    await user.clear(name);
    await user.type(name, "   ");
    await user.click(button);
    expect(greeting).toBeEmptyDOMElement();
  });

  test("残り文字数は空欄・上限の直前・ちょうど・超過で確認できる", async () => {
    const user = userEvent.setup();
    const message = screen.getByLabelText("メッセージ");
    const button = screen.getByRole("button", { name: "残り文字数を確認" });
    const remaining = screen.getByRole("status", { name: "残り文字数" });

    await user.click(button);
    expect(remaining).toHaveTextContent(/^あと 10 文字$/);
    await user.type(message, "a bcdefgh");
    await user.click(button);
    expect(remaining).toHaveTextContent(/^あと 1 文字$/);
    await user.type(message, "i");
    await user.click(button);
    expect(remaining).toHaveTextContent(/^あと 0 文字$/);
    await user.type(message, "j");
    await user.click(button);
    expect(remaining).toHaveTextContent(/^あと 0 文字$/);
  });

  test("数量を変えると合計を更新し、0 と空欄を区別する", async () => {
    const user = userEvent.setup();
    const quantity = screen.getByLabelText("数量（1 個 250 円）");
    const button = screen.getByRole("button", { name: "合計を計算" });
    const total = screen.getByRole("status", { name: "合計" });

    await user.type(quantity, "12");
    await user.click(button);
    expect(total).toHaveTextContent(/^合計 3000 円$/);

    await user.clear(quantity);
    await user.type(quantity, "0");
    await user.click(button);
    expect(total).toHaveTextContent(/^合計 0 円$/);

    await user.clear(quantity);
    await user.click(button);
    expect(total).toBeEmptyDOMElement();
  });

  test("備考は文字として表示し、空白だけや空欄で確かめると前の表示を消す", async () => {
    const user = userEvent.setup();
    const note = screen.getByLabelText("備考");
    const button = screen.getByRole("button", { name: "備考を確認" });
    const result = screen.getByRole("status", { name: "備考の表示" });

    await user.type(note, "  <b>午後に受取</b>  ");
    await user.click(button);
    expect(result).toHaveTextContent(/^<b>午後に受取<\/b>$/);

    await user.clear(note);
    await user.type(note, "   ");
    await user.click(button);
    expect(result).toBeEmptyDOMElement();

    await user.type(note, "午前");
    await user.click(button);
    expect(result).toHaveTextContent(/^午前$/);
    await user.clear(note);
    await user.click(button);
    expect(result).toBeEmptyDOMElement();
  });

  test("チェックを付けたり外したりすると会員区分が変わる", async () => {
    const user = userEvent.setup();
    const member = screen.getByRole("checkbox", { name: "会員" });
    const button = screen.getByRole("button", { name: "会員区分を確認" });
    const result = screen.getByRole("status", { name: "会員区分" });

    await user.click(button);
    expect(result).toHaveTextContent(/^非会員$/);
    await user.click(member);
    await user.click(button);
    expect(result).toHaveTextContent(/^会員$/);
    await user.click(member);
    await user.click(button);
    expect(result).toHaveTextContent(/^非会員$/);
  });

  test("選択肢の value を表示し、未選択に戻すと表示を消す", async () => {
    const user = userEvent.setup();
    const delivery = screen.getByRole("combobox", { name: "受取方法" });
    const button = screen.getByRole("button", { name: "受取方法を確認" });
    const result = screen.getByRole("status", { name: "選んだ受取方法" });

    await user.selectOptions(
      delivery,
      screen.getByRole("option", { name: "配送で受け取る" }),
    );
    await user.click(button);
    expect(result).toHaveTextContent(/^配送$/);
    await user.selectOptions(
      delivery,
      screen.getByRole("option", { name: "店頭で受け取る" }),
    );
    await user.click(button);
    expect(result).toHaveTextContent(/^店頭$/);
    await user.selectOptions(
      delivery,
      screen.getByRole("option", { name: "選んでください" }),
    );
    await user.click(button);
    expect(result).toBeEmptyDOMElement();
  });
});
