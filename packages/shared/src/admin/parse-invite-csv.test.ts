import { describe, expect, it } from "vitest";
import { parseInviteCsv } from "./parse-invite-csv.js";

describe("parseInviteCsv", () => {
  it("ヘッダ行をスキップし、role エイリアスと表示名の既定を解決する", () => {
    const csv = [
      "email,display_name,role",
      "TANAKA@example.com,田中 翔太,受講者",
      "sato@example.com,,講師",
    ].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { email: "tanaka@example.com", displayName: "田中 翔太", role: "student" },
      { email: "sato@example.com", displayName: "sato", role: "instructor" },
    ]);
  });

  it("不正メールと重複を errors に集約する", () => {
    const csv = ["not-an-email", "dup@example.com", "dup@example.com"].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});
