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
