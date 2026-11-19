import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, screen } from "@testing-library/dom";
import { beforeEach, expect, test } from "vitest";
import { setupWorkshop } from "../src/workshop.js";

beforeEach(() => {
  const html = readFileSync(
    join(import.meta.dirname, "..", "index.html"),
    "utf8",
  );
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
  setupWorkshop(document.querySelector("#exercise"));
});

test("入力した数から参加費を求め、空欄で前の金額を消す", () => {
  const kits = screen.getByLabelText("追加する材料セットの数");
  const button = screen.getByRole("button", { name: "計算する" });
  const result = screen.getByRole("status", { name: "参加費" });

  fireEvent.input(kits, { target: { value: "2" } });
  expect(fireEvent.submit(button.form)).toBe(false);
  expect(result).toHaveTextContent(/^参加費は1440円です。$/);

  fireEvent.input(kits, { target: { value: "0" } });
  expect(fireEvent.submit(button.form)).toBe(false);
  expect(result).toHaveTextContent(/^参加費は480円です。$/);

  fireEvent.input(kits, { target: { value: "" } });
  expect(fireEvent.submit(button.form)).toBe(false);
  expect(result).toBeEmptyDOMElement();
});
