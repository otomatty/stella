import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/lib/api-client";
import { resolveMyGroups } from "./useMyGroups";

describe("resolveMyGroups", () => {
  const groups = [{ id: "group", name: "グループ", memberCount: 2 }];
  const previous = resolveMyGroups(null, "learner", { groups });

  it.each([new TypeError("network"), new ApiClientError("unavailable", 503)])(
    "同じ受講者の一時エラーでは成功した一覧を保つ (%s)",
    (error) => {
      expect(resolveMyGroups(previous, "learner", { error })).toBe(previous);
      expect(resolveMyGroups(previous, "other", { error })).toEqual({
        userId: "other",
        data: { status: "error", accessDenied: false },
      });
    },
  );

  it("再取得に成功して空の一覧を受け取ったら前回の一覧を消す", () => {
    expect(resolveMyGroups(previous, "learner", { groups: [] })?.data).toEqual({
      status: "ready",
      groups: [],
    });
  });

  it.each([401, 403, 404])("アクセスできなくなったら前回の一覧を消す (%i)", (status) => {
    expect(
      resolveMyGroups(previous, "learner", { error: new ApiClientError("denied", status) })?.data,
    ).toEqual({ status: "error", accessDenied: true });
  });
});
