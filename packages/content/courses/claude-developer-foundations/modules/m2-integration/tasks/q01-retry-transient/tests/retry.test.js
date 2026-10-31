import { describe, expect, test } from "vitest";
import { withRetry } from "../src/retry.js";

/** 渡した結果を順に返す送信の関数。Error 以外は応答として返し、Error は投げる。 */
function sequence(...outcomes) {
  const calls = { count: 0 };
  const send = async () => {
    const outcome = outcomes[Math.min(calls.count, outcomes.length - 1)];
    calls.count++;
    if (outcome instanceof Error) throw outcome;
    return outcome;
  };
  return { send, calls };
}

function apiError(status, headers = {}) {
  return Object.assign(new Error(`API error ${status}`), { status, headers });
}

function recordSleeps() {
  const waits = [];
  return { waits, sleep: async (ms) => waits.push(ms) };
}

describe("withRetry", () => {
  test("1 回で通ったら、待たずに応答を返す", async () => {
    const { send, calls } = sequence({ id: "msg_01" });
    const { waits, sleep } = recordSleeps();
    await expect(
      withRetry(send, { maxRetries: 3, baseDelayMs: 100, sleep }),
    ).resolves.toEqual({
      id: "msg_01",
    });
    expect(calls.count).toBe(1);
    expect(waits).toEqual([]);
  });

  test("529 のあとは、間隔を倍にしながら送り直す", async () => {
    const { send, calls } = sequence(apiError(529), apiError(529), {
      id: "msg_02",
    });
    const { waits, sleep } = recordSleeps();
    await expect(
      withRetry(send, { maxRetries: 3, baseDelayMs: 100, sleep }),
    ).resolves.toEqual({
      id: "msg_02",
    });
    expect(calls.count).toBe(3);
    expect(waits).toEqual([100, 200]);
  });

  test("429 と 500 も送り直す", async () => {
    const { send } = sequence(apiError(429), apiError(500), { id: "msg_03" });
    const { waits, sleep } = recordSleeps();
    await expect(
      withRetry(send, { maxRetries: 3, baseDelayMs: 50, sleep }),
    ).resolves.toEqual({
      id: "msg_03",
    });
    expect(waits).toEqual([50, 100]);
  });

  test("retry-after があれば、その秒数だけ待つ", async () => {
    const { send } = sequence(apiError(429, { "retry-after": "3" }), {
      id: "msg_04",
    });
    const { waits, sleep } = recordSleeps();
    await withRetry(send, { maxRetries: 3, baseDelayMs: 100, sleep });
    expect(waits).toEqual([3000]);
  });

  test("送り直しても通らないエラーは、待たずにそのまま投げる", async () => {
    const badRequest = apiError(400);
    const { send, calls } = sequence(badRequest, { id: "msg_05" });
    const { waits, sleep } = recordSleeps();
    await expect(
      withRetry(send, { maxRetries: 3, baseDelayMs: 100, sleep }),
    ).rejects.toBe(badRequest);
    expect(calls.count).toBe(1);
    expect(waits).toEqual([]);
  });

  test("上限の回数まで送り直しても通らなければ、最後のエラーを投げる", async () => {
    const { send, calls } = sequence(
      apiError(529),
      apiError(529),
      apiError(529),
      apiError(529),
    );
    const { waits, sleep } = recordSleeps();
    await expect(
      withRetry(send, { maxRetries: 3, baseDelayMs: 100, sleep }),
    ).rejects.toMatchObject({ status: 529 });
    expect(calls.count).toBe(4);
    expect(waits).toEqual([100, 200, 400]);
  });

  test("maxRetries が 0 なら送り直さない", async () => {
    const { send, calls } = sequence(apiError(529), { id: "msg_06" });
    const { sleep } = recordSleeps();
    await expect(
      withRetry(send, { maxRetries: 0, baseDelayMs: 100, sleep }),
    ).rejects.toMatchObject({
      status: 529,
    });
    expect(calls.count).toBe(1);
  });
});
