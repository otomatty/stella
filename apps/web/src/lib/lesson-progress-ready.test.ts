/**
 * サーバ進捗の取り込み待ち (`whenProgressReady`)。
 *
 * これが早く返ると、取り込み前のローカル進捗で「どのレッスンを開くか」が決まり、
 * 途中まで進めてある受講者をステージ先頭へ引き戻す (スキルツリーの
 * 「ここから始める」)。逆に返らないままだと、押した手が固まる。
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { configureRemoteSync, isProgressReady, whenProgressReady } from "@/lib/lesson-progress";

/**
 * 取り込みの HTTP を握って、決着の時刻をこちらで決める。
 *
 * 取り込みは成否によらず決着する (`hydrateFromRemote` の finally) ので、待ちを
 * 観測するには応答そのものを保留させる必要がある。
 */
function holdHydration(): { release: () => void; started: () => Promise<void> } {
  let release: () => void = () => undefined;
  const fetchMock = vi.fn(
    () =>
      new Promise((resolve) => {
        release = () =>
          resolve(
            new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
          );
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return {
    release: () => release(),
    /**
     * 取り込みの HTTP が実際に飛ぶまで待つ。
     *
     * `hydrateFromRemote` は API モジュールを動的 import してから呼ぶので、
     * 「開始した直後」はまだ通信に入っていない。壁時計で待つと、負荷の高い実行
     * (全 spec 並列) で読み込みに数秒かかったときに落ちる。
     */
    started: async () => {
      for (let i = 0; i < 200 && fetchMock.mock.calls.length === 0; i++) {
        await new Promise((r) => setTimeout(r, 25));
      }
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    },
  };
}

let seq = 0;
/** 同期先を切り替える (同じ userId だと `configureRemoteSync` が素通しになる)。 */
function startSync(): void {
  configureRemoteSync({ userId: `user-${++seq}`, tenantId: "ses" });
}

afterEach(() => {
  configureRemoteSync(null);
  vi.unstubAllGlobals();
});

describe("whenProgressReady", () => {
  it("決着済みなら待たずに返る", async () => {
    configureRemoteSync(null);
    expect(isProgressReady()).toBe(true);
    await expect(whenProgressReady()).resolves.toBe(true);
  });

  it("取り込み中は解決せず、決着してから返る", async () => {
    const hydration = holdHydration();
    startSync();
    await hydration.started();
    expect(isProgressReady()).toBe(false);

    // 上限は「決着を待てているか」の観測を邪魔しないだけ大きく取る (上限そのものは
    // 次のケースで見る)。決着すれば待たずに解決するので、実行時間は延びない。
    let settled = false;
    const waiting = whenProgressReady(30_000).then((ready) => {
      settled = true;
      return ready;
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(settled).toBe(false);

    hydration.release();
    await expect(waiting).resolves.toBe(true);
    expect(isProgressReady()).toBe(true);
  });

  it("上限を超えたら false で返す (押した手を固めない)", async () => {
    const hydration = holdHydration();
    startSync();
    await hydration.started();
    await expect(whenProgressReady(10)).resolves.toBe(false);
    expect(isProgressReady()).toBe(false);
  });
});
