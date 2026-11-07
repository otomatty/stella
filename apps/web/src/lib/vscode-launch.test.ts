import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), dismiss: vi.fn(), apiFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(mocks.toast, { dismiss: mocks.dismiss }) }));
vi.mock("./api-client", () => ({ apiFetch: mocks.apiFetch }));

import { nextHandoffHintCount, openInVscode } from "./vscode-launch";

const key = "stella_vscode_handoff_hint_v1";
let browser: EventTarget;
let page: EventTarget & { visibilityState: string };
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  browser = new EventTarget();
  page = Object.assign(new EventTarget(), { visibilityState: "visible" });
  storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
  vi.stubGlobal("window", Object.assign(browser, { setTimeout, clearTimeout }));
  vi.stubGlobal("document", page);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("location", { assign: vi.fn() });
  mocks.apiFetch.mockResolvedValue({ code: "link" });
  mocks.toast.mockReturnValue("toast-id");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function visibility(state: string): void {
  page.visibilityState = state;
  page.dispatchEvent(new Event("visibilitychange"));
}

describe("案内の回数", () => {
  it.each([
    [null, 1],
    ["0", 1],
    ["1", 2],
    ["2", 3],
    ["3", undefined],
    ["4", undefined],
    ["broken", 1],
    ["-1", 1],
    ["1.5", 1],
    ["Infinity", 1],
  ])("保存値 %s の次の回数は %s", (stored, expected) => {
    expect(nextHandoffHintCount(stored)).toBe(expected);
  });
});

describe("VS Code への引き継ぎ", () => {
  it("離れる前の focus では出さず、戻った最初の 1 回だけ 15 秒の案内を出す", async () => {
    await openInVscode({ taskId: "task" });
    browser.dispatchEvent(new Event("focus"));
    expect(mocks.toast).not.toHaveBeenCalled();
    browser.dispatchEvent(new Event("blur"));
    browser.dispatchEvent(new Event("focus"));
    visibility("visible");
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(
      "VS Code で課題を開きました",
      expect.objectContaining({
        duration: 15_000,
        cancel: { label: "閉じる", onClick: expect.any(Function) },
      }),
    );
    expect(storage.setItem).toHaveBeenCalledWith(key, "1");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("遅れて離れたら入手の案内を消し、visibilitychange で戻ったとき案内する", async () => {
    await openInVscode({ taskId: "task" });
    vi.advanceTimersByTime(4_000);
    expect(mocks.toast).toHaveBeenCalledWith("VS Code が開きませんでしたか？", expect.anything());
    visibility("hidden");
    expect(mocks.dismiss).toHaveBeenCalledWith("toast-id");
    visibility("visible");
    expect(mocks.toast).toHaveBeenLastCalledWith("VS Code で課題を開きました", expect.anything());
    expect(vi.getTimerCount()).toBe(0);
  });

  it("3 回表示済みなら戻っても出さない", async () => {
    storage.getItem.mockReturnValue("3");
    await openInVscode({ taskId: "task" });
    visibility("hidden");
    visibility("visible");
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(["read", "write"])("localStorage の %s が失敗しても案内する", async (operation) => {
    const fail = () => {
      throw new Error("unavailable");
    };
    if (operation === "read") storage.getItem.mockImplementation(fail);
    else storage.setItem.mockImplementation(fail);
    await openInVscode({ taskId: "task" });
    visibility("hidden");
    expect(() => visibility("visible")).not.toThrow();
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("30 秒後はイベントとタイマーを解除する (離れた: %s)", async (left) => {
    const removeWindow = vi.spyOn(browser, "removeEventListener");
    const removeDocument = vi.spyOn(page, "removeEventListener");
    await openInVscode({ taskId: "task" });
    if (left) visibility("hidden");
    vi.advanceTimersByTime(30_000);
    mocks.toast.mockClear();
    visibility("hidden");
    visibility("visible");
    browser.dispatchEvent(new Event("blur"));
    browser.dispatchEvent(new Event("focus"));
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(removeWindow).toHaveBeenCalledWith("blur", expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
