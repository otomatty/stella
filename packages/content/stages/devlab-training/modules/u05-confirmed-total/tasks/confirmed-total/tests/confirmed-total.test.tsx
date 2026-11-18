import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { App } from "../src/App";
import { records } from "../provided/records";
import { sumWeek } from "../src/sum-week";
import type { WorkRecord } from "../provided/types";

it("確定30分と下書き20分を一覧に残し、確定分だけを合計する", () => {
  render(<App />);
  const list = within(screen.getByRole("list", { name: "作業記録" }));
  expect(list.getAllByRole("listitem")).toHaveLength(2);
  expect(list.getByText("設計レビュー・30分")).toBeVisible();
  expect(list.getByText("動作確認・20分")).toBeVisible();
  expect(list.getByText("下書き")).toBeVisible();
  expect(screen.getByText("確定分の合計：30分")).toBeVisible();
});

it("下書きを確定するとその場で合計が50分になる", async () => {
  const user = userEvent.setup();
  render(<App />);
  const item = screen.getByText("動作確認・20分").closest("li");
  if (!item) {
    throw new Error("作業記録の行が見つかりません");
  }
  const row = within(item);
  await user.click(row.getByRole("button", { name: "確定する" }));
  expect(row.getByText("確定")).toBeVisible();
  expect(row.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText("確定分の合計：50分")).toBeVisible();
});

it("下書きだけの週は操作でき、確定分の合計は0分になる", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.selectOptions(screen.getByLabelText("対象週"), "2026-W12");
  const list = within(screen.getByRole("list", { name: "作業記録" }));
  expect(list.getAllByText("下書き")).toHaveLength(2);
  expect(list.getByText("画面調整・15分")).toBeVisible();
  expect(list.getAllByRole("button", { name: "確定する" })).toHaveLength(2);
  expect(screen.getByText("確定分の合計：0分")).toBeVisible();
});

it("別の週に確定60分を加えても元の週の50分は変わらない", async () => {
  const user = userEvent.setup();
  const week = "2026-W10";
  const sameWeek = records
    .filter((record) => record.week === week)
    .map((record): WorkRecord => ({ ...record, status: "confirmed" }));
  const otherWeek: WorkRecord = {
    id: "other",
    week: "2026-W13",
    title: "資料整理",
    minutes: 60,
    status: "confirmed",
  };
  const mixed = [...sameWeek, otherWeek];

  expect(sumWeek(sameWeek, week)).toBe(50);
  expect(sumWeek(mixed, week)).toBe(50);
  render(<App initialRecords={mixed} />);
  await user.selectOptions(screen.getByLabelText("対象週"), otherWeek.week);
  expect(screen.getByText("確定分の合計：60分")).toBeVisible();
  await user.selectOptions(screen.getByLabelText("対象週"), week);
  expect(screen.getByText("確定分の合計：50分")).toBeVisible();
});
