// 問題
// 下の Rect、Photo、Banner は、名前も用途も違う型ですが、どれも width と height を持っています。
//
// 1. 大きさを表す型 Size を、{ width: 数値; height: 数値 } として定義して export してください
//
// 2. 次の3つの関数を書いてください。どれも引数の型には Size を使い、
//    Rect、Photo、Banner のどれでも渡せるようにする
//    - area(size)         面積（width × height）を返す
//    - totalArea(sizes)   面積の合計を返す。引数は readonly Size[]
//    - isLandscape(size)  横長（width が height より大きい）なら true を返す
//
// 説明すること（答えは、この下に // のコメントで書く）
// - Photo は Size を使って定義していないのに、なぜ area に渡せるのか
// - area({ url: "a.png", width: 10, height: 20 }) のように、オブジェクトを直接書いて渡すとエラーになる。それはなぜか

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
