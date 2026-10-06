import { readFileSync } from "node:fs";
import path from "node:path";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { setupCounter } from "../src/counter.js";

// 受講者の index.html の <body> を、そのまま画面に読み込む (script は動かさない)。
function loadPage() {
  const file = path.join(import.meta.dirname, "..", "index.html");
  const html = readFileSync(file, "utf8");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
}

describe("カウンター", () => {
  beforeEach(() => {
    loadPage();
    setupCounter(document.querySelector("#counter"));
  });

  test("最初は 0 を表示する", () => {
    expect(screen.getByLabelText("現在の数")).toHaveTextContent("0");
  });

  test("ボタンを押すと 1 増える", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "1 増やす" }));
    await user.click(screen.getByRole("button", { name: "1 増やす" }));
    expect(screen.getByLabelText("現在の数")).toHaveTextContent("2");
  });
});
