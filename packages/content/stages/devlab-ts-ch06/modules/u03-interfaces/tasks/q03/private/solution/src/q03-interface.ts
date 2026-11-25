// 問題
// 1. インターフェース Shape を定義して export してください
//    - name: 図形の名前（文字列）。読み取り専用
//    - area(): 面積を返すメソッド
//    - perimeter(): 周りの長さを返すメソッド
//
// 2. Shape を実装する（implements Shape）クラスを2つ書いてください
//    - Circle: コンストラクタで半径 radius を受け取る。name は "円"
//    - Rectangle: コンストラクタで width と height を受け取る。name は "長方形"
//
// 3. totalArea(shapes): 面積の合計を返す。引数は readonly Shape[]
//
// 4. largest(shapes): 面積がいちばん大きい図形を返す。同じなら先の方。空なら undefined
//
// 説明すること（答えは、この下に // のコメントで書く）
// - interface と type のどちらで書いても同じことができる場面で、どちらを選ぶか。その理由

// クラスに implements させる形や、あとから宣言を足す（宣言マージ）ことがあるなら interface。
// ユニオン型やインターセクション型を組み立てるなら type。どちらでもよいときはチームで決めてそろえる
export interface Shape {
  readonly name: string;
  area(): number;
  perimeter(): number;
}

export class Circle implements Shape {
  readonly name = "円";

  constructor(private readonly radius: number) {}

  area(): number {
    return Math.PI * this.radius * this.radius;
  }

  perimeter(): number {
    return 2 * Math.PI * this.radius;
  }
}

export class Rectangle implements Shape {
  readonly name = "長方形";

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  area(): number {
    return this.width * this.height;
  }

  perimeter(): number {
    return (this.width + this.height) * 2;
  }
}

export function totalArea(shapes: readonly Shape[]): number {
  let total = 0;
  for (const shape of shapes) {
    total += shape.area();
  }
  return total;
}

export function largest(shapes: readonly Shape[]): Shape | undefined {
  let best: Shape | undefined;
  for (const shape of shapes) {
    if (best === undefined || shape.area() > best.area()) {
      best = shape;
    }
  }
  return best;
}
