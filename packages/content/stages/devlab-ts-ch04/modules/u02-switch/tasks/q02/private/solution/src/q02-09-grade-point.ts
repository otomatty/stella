// 問9 成績 "A"、"B"、"C"、"D"、"F" を 4、3、2、1、0 にする
//     例: gradePoint("B") → 3
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
export function gradePoint(grade: "A" | "B" | "C" | "D" | "F"): number {
  switch (grade) {
    case "A":
      return 4;
    case "B":
      return 3;
    case "C":
      return 2;
    case "D":
      return 1;
    case "F":
      return 0;
  }
}
