// enum は JavaScript にない独自の構文で、文字列の enum には同じ文字列をそのまま渡せない（toHex("red") がエラーになる）
export type Color = "red" | "green" | "blue";

export const COLOR_HEX = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
} as const;

export function toHex(color: Color): string {
  return COLOR_HEX[color];
}

export function isColor(text: string): boolean {
  return text === "red" || text === "green" || text === "blue";
}
