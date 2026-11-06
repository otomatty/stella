// 01-q08 ★総合問題 any をなくす
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/any
//       https://typescriptbook.jp/reference/values-types-variables/type-annotation
//
// 問題
// 下のコードは、テストの点数を集計する関数です。引数と戻り値が any なので、型のチェックが効いていません。
// そのせいで見落とされているバグが、2つあります。
//
// 1. any をすべて、正しい型に書き換える（any を1つも残さない）
//    数値の配列の型は number[] と書く（配列は02章で詳しく扱う）
// 2. 型のチェックで見つかったバグを直す
// 3. average は、scores が空の配列なら Error を投げるようにする
// 4. report の文字列の組み立てを、+ ではなくテンプレートリテラル（`…${式}…`）に書き換える
//    （1と4は、書き方のチェック（ESLint）でも確かめます）
//
// 例: report("田中", [80, 90, 70]) → "田中さんの平均点は80.0点（A）"
//
// 説明すること（答えは、この下に // のコメントで書く）
// - any を外したことで見つかったバグは何だったか
// - any のままだと、どんなときに困るか

export function average(scores: any): any {
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  return sum / scores.lenght;
}

export function toGrade(score: any): any {
  if (score >= 80) {
    return "A";
  }
  if (score >= 60) {
    return "B";
  }
  return "C";
}

export function report(name: any, scores: any): any {
  const avg = average(scores);
  return name + "さんの平均点は" + avg.toFixd(1) + "点（" + toGrade(avg) + "）";
}
