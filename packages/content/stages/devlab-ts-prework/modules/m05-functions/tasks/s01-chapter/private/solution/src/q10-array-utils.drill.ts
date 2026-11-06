export type Student = { name: string; grade: number; score: number };

// 問1
export function namesOf(students: readonly Student[]): string[] {
  return students.map((s) => s.name);
}

// 問2
export function averageScore(students: readonly Student[]): number {
  if (students.length === 0) {
    return 0;
  }
  let total = 0;
  for (const s of students) {
    total += s.score;
  }
  return total / students.length;
}

// 問3
export function bestStudent(students: readonly Student[]): Student | undefined {
  let best: Student | undefined;
  for (const s of students) {
    if (best === undefined || s.score > best.score) {
      best = s;
    }
  }
  return best;
}

// 問4
export function inGrade(students: readonly Student[], grade: number): Student[] {
  return students.filter((s) => s.grade === grade);
}

// 問5
export function passedStudents(students: readonly Student[], border: number): Student[] {
  return students.filter((s) => s.score >= border);
}

// 問6
export function sortByScore(students: readonly Student[]): Student[] {
  return [...students].sort((a, b) => b.score - a.score);
}

// 問7
export function rankLabels(students: readonly Student[]): string[] {
  return [...students].sort((a, b) => b.score - a.score).map((s, i) => `${i + 1}位 ${s.name}`);
}

// 問8
export function groupByGrade(students: readonly Student[]): { [grade: string]: Student[] } {
  const groups: { [grade: string]: Student[] } = {};
  for (const s of students) {
    const key = String(s.grade);
    groups[key] = [...(groups[key] ?? []), s];
  }
  return groups;
}

// 問9
export function countByGrade(students: readonly Student[]): { [grade: string]: number } {
  const counts: { [grade: string]: number } = {};
  for (const s of students) {
    const key = String(s.grade);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// 問10
export function averageByGrade(students: readonly Student[]): { [grade: string]: number } {
  const totals: { [grade: string]: number } = {};
  const counts: { [grade: string]: number } = {};
  for (const s of students) {
    const key = String(s.grade);
    totals[key] = (totals[key] ?? 0) + s.score;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const result: { [grade: string]: number } = {};
  for (const [key, total] of Object.entries(totals)) {
    result[key] = Math.round((total / (counts[key] ?? 1)) * 10) / 10;
  }
  return result;
}

// 問11
export function splitByPass(students: readonly Student[], border: number): [Student[], Student[]] {
  return [students.filter((s) => s.score >= border), students.filter((s) => s.score < border)];
}

// 問12
export function topStudents(students: readonly Student[], n: number): Student[] {
  return [...students].sort((a, b) => b.score - a.score).slice(0, n);
}

// 問13
export function scoreTable(students: readonly Student[]): { [name: string]: number } {
  const table: { [name: string]: number } = {};
  for (const s of students) {
    table[s.name] = s.score;
  }
  return table;
}

// 問14
export function hasPerfect(students: readonly Student[]): boolean {
  return students.some((s) => s.score === 100);
}

// 問15
export function everyonePassed(students: readonly Student[], border: number): boolean {
  return students.every((s) => s.score >= border);
}

// 問16
export function totalScore(students: readonly Student[]): number {
  let total = 0;
  for (const s of students) {
    total += s.score;
  }
  return total;
}

// 問17
export function scoreRange(students: readonly Student[]): [number, number] {
  if (students.length === 0) {
    throw new Error("生徒がいません");
  }
  const scores = students.map((s) => s.score);
  return [Math.min(...scores), Math.max(...scores)];
}

// 問18
export function findByName(students: readonly Student[], name: string): Student | undefined {
  return students.find((s) => s.name === name);
}

// 問19
export function updateScore(students: readonly Student[], name: string, score: number): Student[] {
  return students.map((s) => (s.name === name ? { ...s, score } : s));
}

// 問20
export function summaryText(students: readonly Student[]): string {
  let best: Student | undefined;
  let total = 0;
  for (const s of students) {
    total += s.score;
    if (best === undefined || s.score > best.score) {
      best = s;
    }
  }
  if (best === undefined) {
    return "人数 0";
  }
  const average = (total / students.length).toFixed(1);
  return `人数 ${students.length}、平均 ${average}、最高 ${best.name}（${best.score}）`;
}
