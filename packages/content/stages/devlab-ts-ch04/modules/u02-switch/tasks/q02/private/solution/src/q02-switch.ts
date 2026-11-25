// 問題
// 次の3つの関数を、switch 文を使って書いてください。引数と戻り値には型注釈を付けること。
//
// 1. daysInMonth(year, month)
//    その月の日数を返す。2月はうるう年なら 29、そうでなければ 28。
//    うるう年: 4で割り切れる年。ただし100で割り切れる年は除く。ただし400で割り切れる年は含む。
//    month が 1〜12 でなければ Error を投げる。
//    ヒント: case 4: case 6: のように case を並べると、同じ処理にまとめられる
//
// 2. weekdayName(day)
//    曜日の番号（0 が日曜、6 が土曜）を "日"〜"土" にする。0〜6 でなければ Error を投げる
//
// 3. calculate(a, operator, b)
//    operator は "+"、"-"、"*"、"/" のどれか。計算した結果を返す。"/" で b が 0 なら Error を投げる
//
// switch のすべての case で return するか、break を書くこと（書き忘れると次の case に進んでしまう）
// daysInMonth と weekdayName では、どの case にも当てはまらない値は default で扱います。
export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2: {
      const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return leap ? 29 : 28;
    }
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    default:
      throw new Error("月は1〜12にしてください");
  }
}

export function weekdayName(day: number): string {
  switch (day) {
    case 0:
      return "日";
    case 1:
      return "月";
    case 2:
      return "火";
    case 3:
      return "水";
    case 4:
      return "木";
    case 5:
      return "金";
    case 6:
      return "土";
    default:
      throw new Error("曜日の番号は0〜6にしてください");
  }
}

export function calculate(a: number, operator: "+" | "-" | "*" | "/", b: number): number {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      if (b === 0) {
        throw new Error("0で割ることはできません");
      }
      return a / b;
  }
}
