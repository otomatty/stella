// 呼び出し側で戻り値を絞り込む（typeof で確かめる）手間がいらず、そのまま number や string として使える
export function convert(value: string): number;
export function convert(value: number): string;
export function convert(value: string | number): number | string {
  return typeof value === "string" ? Number(value) : String(value);
}

export function pick(items: readonly string[], index: number): string | undefined;
export function pick(items: readonly string[]): string[];
export function pick(items: readonly string[], index?: number): string | undefined | string[] {
  return index === undefined ? [...items] : items[index];
}
