import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StageClearedNotice } from "@stella/shared/cms/types";
import {
  configureRemoteSync,
  flushNow,
  markComplete,
  subscribeProgressSynced,
  whenProgressReady,
} from "./lesson-progress.js";

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("./lesson-progress-api", () => ({
  fetchProgressForUser: async () => ({}),
  upsertProgressBatch: upsert,
}));

let sequence = 0;
beforeEach(async () => {
  upsert.mockReset();
  configureRemoteSync({ userId: `synced-${++sequence}`, tenantId: "ses" });
  await whenProgressReady();
});
afterEach(() => {
  configureRemoteSync(null);
  flushNow();
  vi.restoreAllMocks();
});

const lessonId = () => `11111111-1111-4111-8111-${String(sequence).padStart(12, "0")}`;

describe("予定の更新は完了進捗のサーバ保存を待つ", () => {
  it("ローカル完了や送信開始では通知せず、保存成功後だけ通知する", async () => {
    let release: (value: StageClearedNotice[]) => void = () => undefined;
    upsert.mockReturnValue(
      new Promise<StageClearedNotice[]>((resolve) => {
        release = resolve;
      }),
    );
    const listener = vi.fn();
    const unsubscribe = subscribeProgressSynced(listener);
    try {
      markComplete(lessonId());
      flushNow();
      await vi.waitFor(() => expect(upsert).toHaveBeenCalled());
      expect(listener).not.toHaveBeenCalled();
      release([]);
      await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    } finally {
      unsubscribe();
    }
  });
  it("保存失敗時はサーバにない完了を予定へ反映する通知を出さない", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    upsert.mockRejectedValue(new Error("offline"));
    const listener = vi.fn();
    const unsubscribe = subscribeProgressSynced(listener);
    try {
      markComplete(lessonId());
      flushNow();
      await vi.waitFor(() => expect(error).toHaveBeenCalled());
      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
  it("送信中のログアウト後に前ユーザーの保存結果を通知しない", async () => {
    let release: (value: StageClearedNotice[]) => void = () => undefined;
    const pending = new Promise<StageClearedNotice[]>((resolve) => {
      release = resolve;
    });
    upsert.mockReturnValue(pending);
    const listener = vi.fn();
    const unsubscribe = subscribeProgressSynced(listener);
    try {
      markComplete(lessonId());
      flushNow();
      await vi.waitFor(() => expect(upsert).toHaveBeenCalled());
      configureRemoteSync(null);
      release([]);
      await pending;
      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
});
