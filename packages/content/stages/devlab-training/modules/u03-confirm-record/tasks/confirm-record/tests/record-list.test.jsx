import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { App } from "../src/App.jsx";

it("下書きだけ操作でき、同名の記録でも押した行だけが確定する", async () => {
  const user = userEvent.setup();
  render(<App />);
  const list = within(screen.getByRole("list", { name: "作業記録" }));
  const confirmed = within(list.getByText("設計レビュー・30分").closest("li"));
  const draft = within(list.getByText("動作確認・20分").closest("li"));
  expect(confirmed.getByText("確定")).toBeVisible();
  expect(confirmed.queryByRole("button")).not.toBeInTheDocument();
  expect(draft.getByText("下書き")).toBeVisible();
  expect(draft.getByRole("button", { name: "確定する" })).toBeEnabled();

  await user.selectOptions(screen.getByLabelText("対象週"), "2026-W12");
  const first = within(list.getByText("画面調整・15分").closest("li"));
  const second = within(list.getByText("画面調整・未入力").closest("li"));
  await user.click(first.getByRole("button", { name: "確定する" }));

  expect(first.getByText("確定")).toBeVisible();
  expect(first.queryByRole("button")).not.toBeInTheDocument();
  expect(second.getByText("下書き")).toBeVisible();
  expect(second.getByRole("button", { name: "確定する" })).toBeEnabled();

  await user.click(second.getByRole("button", { name: "確定する" }));
  expect(second.getByText("確定")).toBeVisible();
  expect(second.queryByRole("button")).not.toBeInTheDocument();
});
