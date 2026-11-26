import { describe, expect, test } from "vitest";
import { triage } from "../src/triage.js";

const textAfterTool = {
  content: [
    { type: "tool_result", tool_use_id: "toolu_1", content: "16時" },
    { type: "text", text: "この結果を案内して" },
  ],
};

describe("triage", () => {
  test("HTTP のエラーを停止理由より先に分ける", () => {
    expect(
      triage({
        httpStatus: 429,
        errorType: "rate_limit_error",
        stopReason: "end_turn",
      }),
    ).toEqual({
      layer: "integration",
      mode: "rate_limit",
      action: "wait_and_retry",
    });
    expect(triage({ httpStatus: 529, errorType: "overloaded_error" })).toEqual({
      layer: "integration",
      mode: "overloaded",
      action: "retry_with_backoff",
    });
    expect(triage({ httpStatus: 500, errorType: "overloaded_error" })).toEqual({
      layer: "integration",
      mode: "api_error",
      action: "retry_with_backoff",
    });
    expect(
      triage({
        httpStatus: 400,
        errorType: "invalid_request_error",
        stopReason: "max_tokens",
      }),
    ).toEqual({
      layer: "integration",
      mode: "invalid_request",
      action: "fix_request",
    });
    expect(triage({ httpStatus: 413, errorType: "request_too_large" })).toEqual(
      {
        layer: "integration",
        mode: "request_too_large",
        action: "fix_request",
      },
    );
    expect(
      triage({ httpStatus: 401, errorType: "authentication_error" }),
    ).toEqual({
      layer: "integration",
      mode: "auth",
      action: "fix_credentials",
    });
    expect(triage({ httpStatus: 403, errorType: "permission_error" })).toEqual({
      layer: "integration",
      mode: "auth",
      action: "fix_credentials",
    });
  });

  test("200 の停止理由を、送り直しても直らないものと分ける", () => {
    expect(
      triage({ httpStatus: 200, stopReason: "max_tokens", content: [] }),
    ).toEqual({
      layer: "model",
      mode: "truncated",
      action: "raise_limit_or_continue",
    });
    expect(
      triage({
        httpStatus: 200,
        stopReason: "refusal",
        content: [{ type: "text", text: "できません" }],
      }),
    ).toEqual({
      layer: "model",
      mode: "refusal",
      action: "try_fallback_model",
    });
    expect(
      triage({
        httpStatus: 200,
        stopReason: "pause_turn",
        content: [{ type: "text", text: "" }],
      }),
    ).toEqual({
      layer: "integration",
      mode: "paused",
      action: "resend_unchanged",
    });
  });

  test("ツール結果のあとにテキストを足したあとの空応答は、組み立てを直す", () => {
    expect(
      triage({
        httpStatus: 200,
        stopReason: "end_turn",
        content: [{ type: "thinking", thinking: "終わった" }],
        expectedFormat: "json",
        previousRecord: textAfterTool,
      }),
    ).toEqual({
      layer: "integration",
      mode: "empty_response",
      action: "fix_message_assembly",
    });
  });

  test("印の無い空応答と、JSON として読めない本文を分ける", () => {
    expect(
      triage({
        httpStatus: 200,
        stopReason: "end_turn",
        content: [],
        previousRecord: {
          content: [{ type: "tool_result", tool_use_id: "toolu_1" }],
        },
      }),
    ).toEqual({ layer: "none", mode: "ok", action: "none" });
    expect(
      triage({
        httpStatus: 200,
        stopReason: "end_turn",
        content: [{ type: "text", text: "" }],
        expectedFormat: "json",
      }),
    ).toEqual({
      layer: "model",
      mode: "format_drift",
      action: "use_structured_output",
    });
    expect(
      triage({
        httpStatus: 200,
        stopReason: "end_turn",
        content: [
          { type: "text", text: "結果です\n" },
          { type: "text", text: '{"status":"shipped"}' },
        ],
        expectedFormat: "json",
      }),
    ).toEqual({
      layer: "model",
      mode: "format_drift",
      action: "use_structured_output",
    });
    expect(
      triage({
        httpStatus: 200,
        stopReason: "end_turn",
        content: [{ type: "text", text: '{"status":"shipped"}' }],
        expectedFormat: "json",
      }),
    ).toEqual({ layer: "none", mode: "ok", action: "none" });
    expect(
      triage({
        httpStatus: 200,
        stopReason: "end_turn",
        content: [{ type: "text", text: "受付は 16 時までです。" }],
      }),
    ).toEqual({ layer: "none", mode: "ok", action: "none" });
  });

  test("表に無い組み合わせは手で調べ、記録は書き換えない", () => {
    expect(triage({ httpStatus: 404, errorType: "not_found_error" })).toEqual({
      layer: "integration",
      mode: "unknown",
      action: "inspect_manually",
    });
    expect(
      triage({ httpStatus: 200, stopReason: "tool_use", content: [] }),
    ).toEqual({
      layer: "integration",
      mode: "unknown",
      action: "inspect_manually",
    });
    const record = {
      httpStatus: 200,
      stopReason: "end_turn",
      content: [{ type: "text", text: "受付は 16 時までです。" }],
    };
    const snapshot = structuredClone(record);
    triage(record);
    expect(record).toEqual(snapshot);
  });
});
