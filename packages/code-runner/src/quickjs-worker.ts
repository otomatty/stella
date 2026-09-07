/// <reference lib="webworker" />
/**
 * QuickJS テスト実行用 Web Worker。
 * メインスレッドから `WorkerRequest` を受け取り、`QuickJsRunner` で実行し、
 * `WorkerResponse` を post back する。
 * QuickJS WASM のロードと実行はワーカ内で完結するため、UI スレッドはブロックしない。
 */

import type { RunTestsRequest, RunTestsResponse, TestResult } from "@stella/shared/types";

import { getQuickJSModule, MEMORY_LIMIT_MB, QuickJsRunner } from "./quickjs-runner.js";

export interface WorkerRequest {
  id: number;
  body: RunTestsRequest;
}

export type WorkerResponse =
  | { id: number; ok: true; response: RunTestsResponse }
  | { id: number; ok: false; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const { id, body } = event.data;
  try {
    const quickJS = await getQuickJSModule();
    const runner = new QuickJsRunner(quickJS, MEMORY_LIMIT_MB);

    const start = Date.now();
    const isFreeRun = body.mode === "freerun";
    const results: TestResult[] = isFreeRun
      ? [runner.runFreeRun(body.code)]
      : runner.runAll(body.code, body.tests, {
          testKind: body.testKind,
          entryPoints: body.entryPoints,
        });

    const response: WorkerResponse = {
      id,
      ok: true,
      response: { durationMs: Date.now() - start, results },
    };
    ctx.postMessage(response);
  } catch (e) {
    const response: WorkerResponse = {
      id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
    ctx.postMessage(response);
  }
});
