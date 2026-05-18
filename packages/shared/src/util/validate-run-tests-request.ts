/**
 * POST /run-tests (および /api/run-tests) のリクエストボディ検証。
 */

import type { RunTestsRequest } from "../types.js";

export type ValidateRunTestsOk = { ok: true; body: RunTestsRequest };
export type ValidateRunTestsErr = {
  ok: false;
  status: number;
  message: string;
};

export function validateRunTestsBody(
  raw: unknown,
): ValidateRunTestsOk | ValidateRunTestsErr {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }

  const body = raw as Record<string, unknown>;

  if (typeof body.code !== "string") {
    return { ok: false, status: 400, message: "Missing 'code' (string)" };
  }

  if (
    body.mode !== undefined &&
    body.mode !== "test" &&
    body.mode !== "freerun"
  ) {
    return {
      ok: false,
      status: 400,
      message: "'mode' must be 'test' | 'freerun' when provided",
    };
  }

  const isFreeRun = body.mode === "freerun";

  if (!isFreeRun) {
    if (!Array.isArray(body.tests)) {
      return { ok: false, status: 400, message: "Missing 'tests' (array)" };
    }
    if (body.testKind !== "stdout" && body.testKind !== "function") {
      return {
        ok: false,
        status: 400,
        message: "Missing 'testKind' ('stdout' | 'function')",
      };
    }
  }

  if (body.entryPoints !== undefined && !Array.isArray(body.entryPoints)) {
    return {
      ok: false,
      status: 400,
      message: "'entryPoints' must be an array when provided",
    };
  }

  return { ok: true, body: body as unknown as RunTestsRequest };
}
