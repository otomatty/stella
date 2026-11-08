// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問20
export class Stack {
  private items: number[] = [];

  push(n: number): void {
    this.items.push(n);
  }

  pop(): number | undefined {
    return this.items.pop();
  }

  get size(): number {
    return this.items.length;
  }
}
