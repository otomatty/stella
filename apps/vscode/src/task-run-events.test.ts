import { afterEach, describe, expect, it, vi } from "vitest";

const executeCommand = vi.hoisted(() => vi.fn());

vi.mock("vscode", () => ({
  EventEmitter: class<T> {
    private listeners = new Set<(value: T) => void>();
    event = (listener: (value: T) => void) => {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    };
    fire(value: T) {
      for (const listener of this.listeners) listener(value);
    }
    dispose() {
      this.listeners.clear();
    }
  },
  commands: { executeCommand },
}));

import { onDidChangeTaskBusy, setTaskBusy, taskBusy } from "./task-run-events.js";

describe("setTaskBusy", () => {
  afterEach(() => {
    setTaskBusy(undefined);
  });

  it("stella.taskBusy を設定し、同じ値では通知しない", () => {
    const listener = vi.fn();
    const subscription = onDidChangeTaskBusy(listener);
    setTaskBusy("check");
    expect(taskBusy()).toBe("check");
    expect(executeCommand).toHaveBeenCalledExactlyOnceWith("setContext", "stella.taskBusy", true);
    expect(listener).toHaveBeenCalledExactlyOnceWith("check");

    executeCommand.mockClear();
    listener.mockClear();
    setTaskBusy("check");
    expect(executeCommand).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();

    setTaskBusy(undefined);
    expect(taskBusy()).toBeUndefined();
    expect(executeCommand).toHaveBeenCalledExactlyOnceWith("setContext", "stella.taskBusy", false);
    expect(listener).toHaveBeenCalledExactlyOnceWith(undefined);
    subscription.dispose();
  });
});
