// 問1
export function toggle(state: "on" | "off"): "on" | "off" {
  return state === "on" ? "off" : "on";
}

// 問2
export function signOf(n: number): -1 | 0 | 1 {
  if (n > 0) {
    return 1;
  }
  if (n < 0) {
    return -1;
  }
  return 0;
}

// 問3
export function coinSide(n: number): "表" | "裏" {
  return n % 2 === 0 ? "表" : "裏";
}

// 問4
export function dayType(day: number): "平日" | "休日" {
  return day === 0 || day === 6 ? "休日" : "平日";
}

// 問5
export function nextLight(light: "green" | "yellow" | "red"): "green" | "yellow" | "red" {
  if (light === "green") {
    return "yellow";
  }
  if (light === "yellow") {
    return "red";
  }
  return "green";
}

// 問6
export function gradeOf(score: number): "A" | "B" | "C" {
  if (score >= 80) {
    return "A";
  }
  if (score >= 60) {
    return "B";
  }
  return "C";
}

// 問7
export function isSuccess(code: 200 | 404 | 500): boolean {
  return code === 200;
}

// 問8
export function sizeLabel(size: "S" | "M" | "L"): "小" | "中" | "大" {
  if (size === "S") {
    return "小";
  }
  if (size === "M") {
    return "中";
  }
  return "大";
}

// 問9
export function opposite(
  direction: "north" | "south" | "east" | "west",
): "north" | "south" | "east" | "west" {
  if (direction === "north") {
    return "south";
  }
  if (direction === "south") {
    return "north";
  }
  if (direction === "east") {
    return "west";
  }
  return "east";
}

// 問10
export function answerOf(flag: boolean): "yes" | "no" {
  return flag ? "yes" : "no";
}

// 問11
export function priorityLabel(level: 1 | 2 | 3): "高" | "中" | "低" {
  if (level === 1) {
    return "高";
  }
  if (level === 2) {
    return "中";
  }
  return "低";
}

// 問12
export function rollAgain(face: 1 | 2 | 3 | 4 | 5 | 6): boolean {
  return face === 6;
}

// 問13
export function moveX(x: number, direction: "left" | "right"): number {
  return direction === "left" ? x - 1 : x + 1;
}

// 問14
export function modeLabel(mode: "light" | "dark"): "ライトモード" | "ダークモード" {
  return mode === "light" ? "ライトモード" : "ダークモード";
}

// 問15
export function bitOf(flag: boolean): 0 | 1 {
  return flag ? 1 : 0;
}

// 問16
export function seasonOf(month: number): "春" | "夏" | "秋" | "冬" {
  if (month >= 3 && month <= 5) {
    return "春";
  }
  if (month >= 6 && month <= 8) {
    return "夏";
  }
  if (month >= 9 && month <= 11) {
    return "秋";
  }
  return "冬";
}

// 問17
export function compare(a: number, b: number): -1 | 0 | 1 {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

// 問18
export function methodLabel(method: "GET" | "POST" | "DELETE"): "取得" | "作成" | "削除" {
  if (method === "GET") {
    return "取得";
  }
  if (method === "POST") {
    return "作成";
  }
  return "削除";
}

// 問19
export function statusColor(status: "online" | "busy" | "offline"): "green" | "red" | "gray" {
  if (status === "online") {
    return "green";
  }
  if (status === "busy") {
    return "red";
  }
  return "gray";
}

// 問20
export function medal(rank: number): "金" | "銀" | "銅" | "なし" {
  if (rank === 1) {
    return "金";
  }
  if (rank === 2) {
    return "銀";
  }
  if (rank === 3) {
    return "銅";
  }
  return "なし";
}
