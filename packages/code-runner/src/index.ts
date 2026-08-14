// 公開エントリポイント。
// `@falcon/code-runner` から runGrading / getRunner を一括 import できる。

export { runGrading, getRunner, type DispatchResult } from "./runners/index.js";
export { runTestsLocally, setQuickJsWorkerUrl } from "./run-tests-local.js";
export { setSqlJsLocateFile, sqlJsFileUrl } from "./runners/sql-runner.js";
export {
  GLOBALS,
  getLinter,
  lintAssignment,
  lintCode,
  linter,
  type Linter,
  type LintCodeOptions,
} from "./lint.js";
