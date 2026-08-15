/**
 * Web Worker に QuickJS テスト実行を委譲する `runTests` 等価ラッパ。
 * メインスレッドをブロックしないために実体はワーカ側 (`quickjs-worker.ts`) で動かす。
 */

import type { RunTestsRequest, RunTestsResponse } from "@falcon/shared/types";
import { validateRunTestsBody } from "@falcon/shared/util/validate-run-tests-request";

import type { WorkerRequest, WorkerResponse } from "./quickjs-worker.js";

let workerInstance: Worker | null = null;
let workerUrlOverride: URL | string | undefined;
let nextRequestId = 1;

/** Grader WebView など、バンドル後の worker ファイル URL を差し替える。 */
export function setQuickJsWorkerUrl(url: URL | string): void {
  workerUrlOverride = url;
  if (workerInstance !== null) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

/**
 * 全テスト合計の安全網タイムアウト。
 * QuickJS ランナー側で 1 テスト = 最大 3s の壁時間制限があり、課題は 10 件未満なので
 * 通常は数秒で返る。WASM ロード失敗等で worker が応答しないケースを想定して 60s。
 */
const WORKER_RESPONSE_TIMEOUT_MS = 60_000;

function getWorker(): Worker {
  if (workerInstance === null) {
    workerInstance = new Worker(
      workerUrlOverride ?? new URL("./quickjs-worker.ts", import.meta.url),
      { type: "module" },
    );
  }
  return workerInstance;
}

export async function runTestsLocally(body: RunTestsRequest): Promise<RunTestsResponse> {
  const validated = validateRunTestsBody(body);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const worker = getWorker();
  const requestId = nextRequestId++;

  return new Promise<RunTestsResponse>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== requestId) {
        return;
      }
      cleanup();
      if (event.data.ok) {
        resolve(event.data.response);
      } else {
        reject(new Error(event.data.error));
      }
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      // ワーカ自体が落ちた可能性があるため、終了させて次回呼び出しで作り直す。
      worker.terminate();
      workerInstance = null;
      reject(new Error(event.message || "QuickJS worker error"));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);

    timeoutId = setTimeout(() => {
      cleanup();
      // 応答が無いワーカは状態不明として破棄。次回は新規生成する。
      worker.terminate();
      workerInstance = null;
      reject(new Error("QuickJS worker did not respond in time"));
    }, WORKER_RESPONSE_TIMEOUT_MS);

    const request: WorkerRequest = { id: requestId, body: validated.body };
    try {
      worker.postMessage(request);
    } catch (e) {
      cleanup();
      worker.terminate();
      workerInstance = null;
      reject(e instanceof Error ? e : new Error("Failed to post message to QuickJS worker"));
    }
  });
}
