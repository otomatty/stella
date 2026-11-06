// Photo は width と height を持つので、Size の形を満たす（構造的型付け）。名前で判定しない
// オブジェクトリテラルを直接渡すと、余剰プロパティチェックで url が「Size にないプロパティ」として弾かれる
export type Rect = { width: number; height: number };
export type Photo = { url: string; width: number; height: number };
export type Banner = { text: string; color: string; width: number; height: number };

export type Size = { width: number; height: number };

export function area(size: Size): number {
  return size.width * size.height;
}

export function totalArea(sizes: readonly Size[]): number {
  let total = 0;
  for (const size of sizes) {
    total += area(size);
  }
  return total;
}

export function isLandscape(size: Size): boolean {
  return size.width > size.height;
}
