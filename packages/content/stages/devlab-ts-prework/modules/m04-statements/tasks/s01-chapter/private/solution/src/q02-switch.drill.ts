// 問1
export function dayName(day: number): string {
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
      return "?";
  }
}

// 問2
export function seasonOfMonth(month: number): "春" | "夏" | "秋" | "冬" {
  switch (month) {
    case 3:
    case 4:
    case 5:
      return "春";
    case 6:
    case 7:
    case 8:
      return "夏";
    case 9:
    case 10:
    case 11:
      return "秋";
    case 12:
    case 1:
    case 2:
      return "冬";
    default:
      throw new Error("月は1〜12にしてください");
  }
}

// 問3
export function calc(a: number, op: "+" | "-" | "*" | "/", b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
  }
}

// 問4
export function httpMessage(code: number): string {
  switch (code) {
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 404:
      return "Not Found";
    case 500:
      return "Internal Server Error";
    default:
      return "Unknown";
  }
}

// 問5
export function planLimit(plan: "free" | "pro" | "team"): number {
  switch (plan) {
    case "free":
      return 1;
    case "pro":
      return 10;
    case "team":
      return 100;
  }
}

// 問6
export function colorHex(color: "red" | "green" | "blue"): string {
  switch (color) {
    case "red":
      return "#ff0000";
    case "green":
      return "#00ff00";
    case "blue":
      return "#0000ff";
  }
}

// 問7
export function turnLeft(direction: "N" | "E" | "S" | "W"): "N" | "E" | "S" | "W" {
  switch (direction) {
    case "N":
      return "W";
    case "W":
      return "S";
    case "S":
      return "E";
    case "E":
      return "N";
  }
}

// 問8
export function romanDigit(n: number): string {
  switch (n) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    case 5:
      return "V";
    default:
      return "";
  }
}

// 問9
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

// 問10
export function metersPer(unit: "mm" | "cm" | "m" | "km"): number {
  switch (unit) {
    case "mm":
      return 0.001;
    case "cm":
      return 0.01;
    case "m":
      return 1;
    case "km":
      return 1000;
  }
}

// 問11
export function sizeOrder(size: "S" | "M" | "L" | "XL"): number {
  switch (size) {
    case "S":
      return 1;
    case "M":
      return 2;
    case "L":
      return 3;
    case "XL":
      return 4;
  }
}

// 問12
export function dayKind(day: string): "平日" | "週末" {
  switch (day) {
    case "月":
    case "火":
    case "水":
    case "木":
    case "金":
      return "平日";
    case "土":
    case "日":
      return "週末";
    default:
      throw new Error(`曜日ではありません: ${day}`);
  }
}

// 問13
export function quarterOf(month: number): 1 | 2 | 3 | 4 {
  switch (month) {
    case 1:
    case 2:
    case 3:
      return 1;
    case 4:
    case 5:
    case 6:
      return 2;
    case 7:
    case 8:
    case 9:
      return 3;
    case 10:
    case 11:
    case 12:
      return 4;
    default:
      throw new Error("月は1〜12にしてください");
  }
}

// 問14
export function moodEmoji(mood: "happy" | "sad" | "angry"): "😊" | "😢" | "😠" {
  switch (mood) {
    case "happy":
      return "😊";
    case "sad":
      return "😢";
    case "angry":
      return "😠";
  }
}

// 問15
export function fileKind(extension: string): "画像" | "動画" | "文書" | "その他" {
  switch (extension) {
    case "png":
    case "jpg":
    case "gif":
      return "画像";
    case "mp4":
    case "mov":
      return "動画";
    case "pdf":
    case "docx":
      return "文書";
    default:
      return "その他";
  }
}

// 問16
export function letterKind(char: string): "母音" | "子音" {
  switch (char) {
    case "a":
    case "e":
    case "i":
    case "o":
    case "u":
      return "母音";
    default:
      return "子音";
  }
}

// 問17
export function signalAction(light: "red" | "yellow" | "green"): "止まれ" | "注意" | "進め" {
  switch (light) {
    case "red":
      return "止まれ";
    case "yellow":
      return "注意";
    case "green":
      return "進め";
  }
}

// 問18
export function keyName(code: number): string {
  switch (code) {
    case 13:
      return "Enter";
    case 27:
      return "Escape";
    case 32:
      return "Space";
    default:
      return "Other";
  }
}

// 問19
export function elementOf(sign: "牡羊" | "獅子" | "射手" | "牡牛" | "乙女" | "山羊"): "火" | "地" {
  switch (sign) {
    case "牡羊":
    case "獅子":
    case "射手":
      return "火";
    case "牡牛":
    case "乙女":
    case "山羊":
      return "地";
  }
}

// 問20
export function priorityWeight(priority: "high" | "middle" | "low"): number {
  switch (priority) {
    case "high":
      return 3;
    case "middle":
      return 2;
    case "low":
      return 1;
  }
}
