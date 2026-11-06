import { describe, expect, test } from "vitest";
import { buildBatchRequests, matchResults } from "../src/batch.js";

const options = {
  model: "claude-haiku-5-5",
  maxTokens: 256,
  system: "問い合わせを「請求」「配送」「その他」のどれかに分類してください",
};

describe("buildBatchRequests", () => {
  test("問い合わせごとに custom_id と params を持つリクエストを作る", () => {
    const requests = buildBatchRequests(
      [
        { id: "T-001", body: "請求書が届きません" },
        { id: "T-002", body: "荷物がまだ来ません" },
      ],
      options,
    );
    expect(requests).toEqual([
      {
        custom_id: "ticket-T-001",
        params: {
          model: "claude-haiku-5-5",
          max_tokens: 256,
          system: options.system,
          messages: [{ role: "user", content: "請求書が届きません" }],
        },
      },
      {
        custom_id: "ticket-T-002",
        params: {
          model: "claude-haiku-5-5",
          max_tokens: 256,
          system: options.system,
          messages: [{ role: "user", content: "荷物がまだ来ません" }],
        },
      },
    ]);
  });

  test("ID が重なる問い合わせがあれば、エラーにする", () => {
    const tickets = [
      { id: "T-001", body: "請求書が届きません" },
      { id: "T-001", body: "請求書を再発行してください" },
    ];
    expect(() => buildBatchRequests(tickets, options)).toThrow(/T-001/);
  });

  test("custom_id に使えない文字を含む ID は、エラーにする", () => {
    expect(() =>
      buildBatchRequests([{ id: "T/003", body: "住所を変えたい" }], options),
    ).toThrow(/T\/003/);
  });
});

describe("matchResults", () => {
  const succeeded = (customId, text) => ({
    custom_id: customId,
    result: {
      type: "succeeded",
      message: { content: [{ type: "text", text }], stop_reason: "end_turn" },
    },
  });

  test("結果の並び順によらず、custom_id で引ける", () => {
    const byId = matchResults([
      succeeded("ticket-T-002", "配送"),
      succeeded("ticket-T-001", "請求"),
    ]);
    expect(byId.get("ticket-T-001")).toEqual({ ok: true, text: "請求" });
    expect(byId.get("ticket-T-002")).toEqual({ ok: true, text: "配送" });
  });

  test("応答の無い結果は、種類を理由として返す", () => {
    const byId = matchResults([
      {
        custom_id: "ticket-T-003",
        result: {
          type: "errored",
          error: { type: "invalid_request_error", message: "..." },
        },
      },
      { custom_id: "ticket-T-004", result: { type: "expired" } },
      { custom_id: "ticket-T-005", result: { type: "canceled" } },
    ]);
    expect(byId.get("ticket-T-003")).toEqual({ ok: false, reason: "errored" });
    expect(byId.get("ticket-T-004")).toEqual({ ok: false, reason: "expired" });
    expect(byId.get("ticket-T-005")).toEqual({ ok: false, reason: "canceled" });
  });
});
