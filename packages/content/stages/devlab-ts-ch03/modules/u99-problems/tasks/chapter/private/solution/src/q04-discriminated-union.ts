export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

export function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius * shape.radius;
    case "rect":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
  }
}

export function describeShape(shape: Shape): string {
  switch (shape.kind) {
    case "circle":
      return `円（半径 ${shape.radius}）`;
    case "rect":
      return `長方形（${shape.width} × ${shape.height}）`;
    case "triangle":
      return `三角形（底辺 ${shape.base}・高さ ${shape.height}）`;
  }
}
