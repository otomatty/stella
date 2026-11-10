import { describe, expect, it } from "vitest";
import { parseInviteCsv } from "./parse-invite-csv.js";

describe("parseInviteCsv", () => {
  it("ヘッダ行をスキップし、role エイリアスと表示名の既定を解決する", () => {
    const csv = [
      "email,display_name,role",
      "TANAKA@example.com,田中 翔太,受講者",
      "sato@example.com,,管理者",
    ].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { email: "tanaka@example.com", displayName: "田中 翔太", role: "student" },
      { email: "sato@example.com", displayName: "sato", role: "admin" },
    ]);
  });

  it("廃止した講師ロール (instructor / 講師 / メンター) は不明なロールとして受け付けない", () => {
    const csv = [
      "email,display_name,role",
      "mentor@example.com,堀江,講師",
      "en@example.com,Ada,instructor",
      "alias@example.com,Bea,メンター",
    ].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(rows).toEqual([]);
    expect(errors).toEqual([
      "2 行目: ロールが不正です (講師)",
      "3 行目: ロールが不正です (instructor)",
      "4 行目: ロールが不正です (メンター)",
    ]);
  });

  it("廃止した営業ロール (sales / 営業) は受け付けない", () => {
    const csv = [
      "email,display_name,role",
      "sales-en@example.com,Seed Sales EN,sales",
      "sales-ja@example.com,Seed Sales JA,営業",
    ].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
  });

  it("不正メールと重複を errors に集約する", () => {
    const csv = ["not-an-email", "dup@example.com", "dup@example.com"].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});
