/**
 * テスト用: lockfile の `engines.node` の範囲 (`^22.13.0 || >=24`) を読み、版が範囲に入るかを
 * 確かめる。テンプレートの lockfile に出てくる書き方 (`>=`・`^`・`~`・`1.x`・`1.*`・`1`・
 * 空白区切りの AND・`||`) だけを扱い、読めない書き方は例外にする (黙って通さない)。
 */

import { compareVersions, type Version } from "@stella/shared/tasks/environment";

const COMPARATOR = /^(>=|<=|>|<|=|\^|~)?v?(\d+|[*xX])(?:\.(\d+|[*xX]))?(?:\.(\d+|[*xX]))?$/;

export function satisfiesRange(version: Version, range: string): boolean {
  return range.split("||").some((set) => {
    // `>= 0.8` のように、演算子と版の間に空白を入れた書き方もある。
    const comparators = set
      .trim()
      .replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1")
      .split(/\s+/)
      .filter((c) => c.length > 0);
    return comparators.every((comparator) => satisfiesComparator(version, comparator));
  });
}

function satisfiesComparator(version: Version, comparator: string): boolean {
  const match = COMPARATOR.exec(comparator);
  if (!match) throw new Error(`engines の書き方を読めません: ${comparator}`);
  const op = match[1] ?? "";
  // 数字で書かれた部分。x・*・省略より後は問わない。
  const fixed: number[] = [];
  for (const part of [match[2], match[3], match[4]]) {
    if (part === undefined || !/^\d+$/.test(part)) break;
    fixed.push(Number(part));
  }
  const lower: Version = [fixed[0] ?? 0, fixed[1] ?? 0, fixed[2] ?? 0];
  const atLeast = compareVersions(version, lower) >= 0;
  const samePrefix = (n: number) => fixed.slice(0, n).every((value, i) => version[i] === value);
  switch (op) {
    case "":
    case "=":
      return samePrefix(fixed.length);
    case ">=":
      return atLeast;
    case "^": {
      // 左から最初の 0 でない部分までが同じ (^22.13.0 は 22 系、^0.4.1 は 0.4 系)。
      const keep = fixed.findIndex((value) => value !== 0);
      return atLeast && samePrefix(keep === -1 ? fixed.length : Math.min(keep + 1, fixed.length));
    }
    case "~":
      return atLeast && samePrefix(fixed.length >= 2 ? 2 : 1);
    default:
      // `>`・`<`・`<=` は、省略した版の意味が >= と違う。全部書いた版だけを扱う。
      if (fixed.length < 3) throw new Error(`engines の書き方を読めません: ${comparator}`);
      if (op === ">") return compareVersions(version, lower) > 0;
      if (op === "<") return compareVersions(version, lower) < 0;
      return compareVersions(version, lower) <= 0;
  }
}
