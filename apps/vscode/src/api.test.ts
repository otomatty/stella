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

const readTimeoutMessage =
  "LMS から応答がありませんでした。通信を確かめて、もう一度実行してください";
const writeTimeoutMessage =
  "LMS から応答がありませんでした。送った内容が届いている場合があります。Web の教材の画面で提出の状態を確かめてから、必要ならもう一度送ってください";

describe("apiRequest の時間切れ", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    [undefined, readTimeoutMessage],
    ["GET", readTimeoutMessage],
    ["HEAD", readTimeoutMessage],
    ["get", readTimeoutMessage],
    ["head", readTimeoutMessage],
    ["POST", writeTimeoutMessage],
    ["post", writeTimeoutMessage],
    ["PUT", writeTimeoutMessage],
    ["PATCH", writeTimeoutMessage],
    ["DELETE", writeTimeoutMessage],
  ])("%s の通信を既定の時間で打ち切ると、操作に合う案内を出す", async (method, message) => {
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      expect(ms).toBe(API_TIMEOUT_MS);
      return realTimeout(30);
    });
    initApi(auth, () => "https://stella.example");
    vi.stubGlobal("fetch", vi.fn(hangUntilAbort));
    await expect(apiRequest("/api/submissions", { method })).rejects.toThrow(message);
  });

  it.each([
    ["GET", readTimeoutMessage],
    ["POST", writeTimeoutMessage],
  ])("%s の応答本文の読み取りが時間切れでも、操作に合う案内を出す", async (method, message) => {
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
    await expect(apiRequest("/api/submissions", { method })).rejects.toThrow(message);
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
