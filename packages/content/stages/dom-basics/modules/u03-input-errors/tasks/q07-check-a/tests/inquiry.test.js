import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, screen } from "@testing-library/dom";
import { beforeEach, expect, test } from "vitest";
import { setupInquiry } from "../src/inquiry.js";

const fields = [
  { label: "件名", message: "件名は1〜30文字で入力してください。" },
  { label: "本文", message: "本文は10〜100文字で入力してください。" },
  { label: "返信先", message: "返信先に@を含めてください。" },
];
const valid = {
  件名: " 質 ",
  本文: " 1234567890 ",
  返信先: "reply@example.com",
};
const alternate = {
  件名: "案案案案案案案案案案案案案案案案案案案案案案案案案案案案案案",
  本文: "文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文",
  返信先: "a@b",
};
const invalid = {
  件名: [
    "   ",
    "題題題題題題題題題題題題題題題題題題題題題題題題題題題題題題題",
  ],
  本文: [
    "123456789",
    "文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文文",
  ],
  返信先: ["reply.example.com", "   "],
};

beforeEach(() => {
  const html = readFileSync(
    join(import.meta.dirname, "..", "index.html"),
    "utf8",
  );
  const page = new DOMParser().parseFromString(html, "text/html");
  document.body.innerHTML = page.body.innerHTML;
  setupInquiry(document.querySelector("#exercise"));
});

function input(label, value) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
}

function fill(values) {
  for (const [label, value] of Object.entries(values)) {
    input(label, value);
  }
}

function submit() {
  const button = screen.getByRole("button", { name: "送信する" });
  expect(fireEvent.submit(button.form)).toBe(false);
}

function result() {
  return screen.getByRole("status", { name: "問い合わせ結果" });
}

test("無効な送信を繰り返しても各欄のエラー文は一つずつ表示される", () => {
  submit();
  submit();

  for (const { label, message } of fields) {
    const field = screen.getByLabelText(label);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(message);
    expect(screen.getAllByText(message, { exact: true })).toHaveLength(1);
  }
  expect(result()).toBeEmptyDOMElement();
});

test.each(fields)(
  "有効に直した $label のエラーだけを消す",
  ({ label, message }) => {
    submit();
    const field = screen.getByLabelText(label);
    const descriptionId = field.getAttribute("aria-describedby");
    input(label, invalid[label][0]);
    expect(field).toHaveAccessibleDescription(message);
    expect(field).toHaveAttribute("aria-invalid", "true");

    input(label, valid[label]);

    expect(field).not.toHaveAccessibleDescription();
    expect(field).not.toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", descriptionId);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    for (const other of fields.filter((entry) => entry.label !== label)) {
      expect(screen.getByLabelText(other.label)).toHaveAccessibleDescription(
        other.message,
      );
    }
    expect(result()).toBeEmptyDOMElement();
  },
);

test.each(fields)("無効な $label の入力を拒否する", ({ label, message }) => {
  for (const value of invalid[label]) {
    fill(valid);
    input(label, value);
    submit();
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
    expect(result()).toBeEmptyDOMElement();
  }
});

test("初回送信まではエラーを出さず、条件を満たす二通りの入力を受け付ける", () => {
  input(fields[0].label, invalid[fields[0].label][0]);
  expect(
    screen.getByLabelText(fields[0].label),
  ).not.toHaveAccessibleDescription();
  fill(valid);
  submit();
  expect(result()).toHaveTextContent("問い合わせを受け付けました。");
  fill(alternate);
  expect(result()).toBeEmptyDOMElement();
  submit();
  expect(result()).toHaveTextContent("問い合わせを受け付けました。");
  for (const { label } of fields) {
    expect(screen.getByLabelText(label)).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  }
});
