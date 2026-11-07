// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問8
import greet from "./shared/q05-modules.lib";

export function welcome(name: string): string {
  return `${greet(name)}！`;
}
