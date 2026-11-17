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
