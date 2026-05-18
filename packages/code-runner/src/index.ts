// 公開エントリポイント。
// `@falcon/code-runner` から runGrading / getRunner を一括 import できる。

export { runGrading, getRunner, type DispatchResult } from "./runners/index.js";
export { runTestsLocally } from "./run-tests-local.js";
