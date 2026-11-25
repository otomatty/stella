// 問題
// 生徒を表す型 Student は定義済みです。生徒の配列を集計する関数を書いてください。
// 引数の配列は readonly Student[] にし、元の配列や生徒のオブジェクトは変えないこと。引数と戻り値には型注釈を付けること。
//
// 1. groupBy(students, keyFn)
//    keyFn(生徒) が返す文字列ごとに、生徒をまとめる。戻り値は { [key: string]: Student[] }
//    例: groupBy(students, (s) => `${s.grade}年`) → { "1年": [...], "2年": [...] }
//
// 2. countBy(students, keyFn)
//    keyFn(生徒) が返す文字列ごとに、人数を数える。戻り値は { [key: string]: number }
//
// 3. partition(students, predicate)
//    predicate が true の生徒と false の生徒に分け、[true の配列, false の配列] を返す
//
// 4. topN(students, n)
//    点数の高い順に n 人を返す。同じ点数なら元の順のまま。n が負なら空の配列、人数より多ければ全員
//
// 5. averageBy(students, keyFn)
//    keyFn(生徒) が返す文字列ごとに、点数の平均を小数第1位までに四捨五入して返す。戻り値は { [key: string]: number }
//    groupBy を使うと短く書ける
//
// このファイルに書く関数（export は不要）
// - clamp(value, min, max): 数値の value を min 以上 max 以下に収めて返す。
//   min が max より大きければ Error を投げる。topN の n を 0 以上・生徒の人数以下に収めるときに使う。
// - sumAll(...numbers): 数値を残余引数で受け取り、すべての合計を返す。引数がなければ 0。
//   averageBy で点数の合計を出すときに使う。

function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error("min は max 以下にしてください");
  }
  return Math.min(Math.max(value, min), max);
}

function sumAll(...numbers: number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

export type Student = { name: string; grade: number; score: number };

export function groupBy(
  students: readonly Student[],
  keyFn: (student: Student) => string,
): { [key: string]: Student[] } {
  const groups: { [key: string]: Student[] } = {};
  for (const student of students) {
    const key = keyFn(student);
    groups[key] = [...(groups[key] ?? []), student];
  }
  return groups;
}

export function countBy(
  students: readonly Student[],
  keyFn: (student: Student) => string,
): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  for (const student of students) {
    const key = keyFn(student);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function partition(
  students: readonly Student[],
  predicate: (student: Student) => boolean,
): [Student[], Student[]] {
  const yes: Student[] = [];
  const no: Student[] = [];
  for (const student of students) {
    if (predicate(student)) {
      yes.push(student);
    } else {
      no.push(student);
    }
  }
  return [yes, no];
}

export function topN(students: readonly Student[], n: number): Student[] {
  const count = clamp(n, 0, students.length);
  return [...students].sort((a, b) => b.score - a.score).slice(0, count);
}

export function averageBy(
  students: readonly Student[],
  keyFn: (student: Student) => string,
): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  for (const [key, group] of Object.entries(groupBy(students, keyFn))) {
    const total = sumAll(...group.map((student) => student.score));
    result[key] = Math.round((total / group.length) * 10) / 10;
  }
  return result;
}
