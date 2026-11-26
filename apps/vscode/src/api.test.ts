import { afterEach, describe, expect, it, vi } from "vitest";
import { API_TIMEOUT_MS, apiRequest, initApi } from "./api.js";

const auth = {
  currentSession: () => 1,
  getToken: async () => "token",
  getTokenInSession: async () => "token",
  clear: async () => undefined,
};

function hangUntilAbort(_url: string, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return;
    const fail = () => reject(signal.reason);
    if (signal.aborted) fail();
    else signal.addEventListener("abort", fail, { once: true });
  });
}

describe("apiRequest の時間切れ", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("既定の時間で打ち切ると、通信を確かめる案内を出す", async () => {
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      expect(ms).toBe(API_TIMEOUT_MS);
      return realTimeout(30);
    });
    initApi(auth, () => "https://stella.example");
    vi.stubGlobal("fetch", vi.fn(hangUntilAbort));
    await expect(apiRequest("/api/submissions", { method: "POST", body: {} })).rejects.toThrow(
      "LMS から応答がありませんでした。通信を確かめて、もう一度実行してください",
    );
  });

  it("応答本文の読み取りが時間切れでも、同じ案内を出す", async () => {
    const timeoutSignal = AbortSignal.abort(new DOMException("timed out", "TimeoutError"));
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    initApi(auth, () => "https://stella.example");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new DOMException("timed out", "TimeoutError");
        },
      })),
    );
    await expect(apiRequest("/api/me")).rejects.toThrow(
      "LMS から応答がありませんでした。通信を確かめて、もう一度実行してください",
    );
  });

  it("呼び出し側の signal で中断した例外は、そのまま投げる", async () => {
    initApi(auth, () => "https://stella.example");
    vi.stubGlobal("fetch", vi.fn(hangUntilAbort));
    const controller = new AbortController();
    const pending = apiRequest("/api/submissions", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("JSON でない応答は空として読む", async () => {
    initApi(auth, () => "https://stella.example");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("unexpected");
        },
      })),
    );
    await expect(apiRequest("/api/me")).resolves.toBeNull();
  });
});
