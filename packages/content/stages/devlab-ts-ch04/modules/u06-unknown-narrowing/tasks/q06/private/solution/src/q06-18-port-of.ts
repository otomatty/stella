// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard

// 問18
export function portOf(config: unknown): number {
  if (
    typeof config === "object" &&
    config !== null &&
    "port" in config &&
    typeof config.port === "number"
  ) {
    return config.port;
  }
  return 3000;
}
