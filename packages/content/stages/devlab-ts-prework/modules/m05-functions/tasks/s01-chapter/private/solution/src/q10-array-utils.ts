import { clamp } from "./q02-params-return";
import { sumAll } from "./q05-rest-params";

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
