// 問20 下のクラス Stack を export する
//     例: new Stack() で作れる
class Stack {
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
