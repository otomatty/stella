// 問1
export function lengthOf(text: string): number {
  return text.length;
}

// 問2
export function toUpper(text: string): string {
  return text.toUpperCase();
}

// 問3
export function firstThree(text: string): string {
  return text.slice(0, 3);
}

// 問4
export function lastChar(text: string): string {
  return text.slice(-1);
}

// 問5
export function hasWord(text: string, word: string): boolean {
  return text.includes(word);
}

// 問6
export function isHashtag(text: string): boolean {
  return text.startsWith("#");
}

// 問7
export function isPng(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".png");
}

// 問8
export function padId(id: number): string {
  return String(id).padStart(4, "0");
}

// 問9
export function normalize(text: string): string {
  return text.trim().toLowerCase();
}

// 問10
export function snakeSpaces(text: string): string {
  return text.replaceAll(" ", "_");
}

// 問11
export function atPosition(email: string): number {
  return email.indexOf("@");
}

// 問12
export function capitalize(text: string): string {
  return `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;
}

// 問13
export function surround(text: string, mark: string): string {
  return `${mark}${text}${mark}`;
}

// 問14
export function isPalindrome(text: string): boolean {
  let reversed = "";
  for (const c of text) {
    reversed = c + reversed;
  }
  return text === reversed;
}

// 問15
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}****${phone.slice(8)}`;
}

// 問16
export function extension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1);
}

// 問17
export function clockText(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// 問18
export function removeVowels(text: string): string {
  return text.replace(/[aeiou]/g, "");
}

// 問19
export function charAtOrEmpty(text: string, index: number): string {
  return text.charAt(index);
}

// 問20
export function sameIgnoringCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
