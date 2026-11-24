// 問15 型 Grade（"A"、"B"、"C"、"D"）を定義して export し、gradeFrom(score: number) を書く。90以上 A、70以上 B、50以上 C、それ未満 D
//     例: gradeFrom(75) → "B"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type Grade = "A" | "B" | "C" | "D";

export function gradeFrom(score: number): Grade {
  if (score >= 90) {
    return "A";
  }
  if (score >= 70) {
    return "B";
  }
  if (score >= 50) {
    return "C";
  }
  return "D";
}
