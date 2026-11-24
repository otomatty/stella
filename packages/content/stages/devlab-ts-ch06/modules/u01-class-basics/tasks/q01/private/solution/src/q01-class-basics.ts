// 問題
// 次の2つのクラスを書いてください。フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けること。
//
// 1. Counter
//    - フィールド count（数値）: 今の値
//    - コンストラクタ: 始めの値 start を受け取る。省略したら 0
//    - increment(): 1増やして、増やした後の値を返す
//    - decrement(): 1減らして、減らした後の値を返す。ただし 0 より小さくはしない
//    - reset(): 始めの値に戻す。何も返さない（始めの値を覚えておくフィールドが要る）
//
// 2. Temperature
//    - コンストラクタ: 摂氏 celsius を受け取り、フィールド celsius に入れる
//    - toFahrenheit(): 華氏（摂氏 × 9 ÷ 5 + 32）を返す
//    - isFreezing(): 0 以下なら true
//    - label(): "25℃" の形の文字列を返す

export class Counter {
  count: number;
  private readonly start: number;

  constructor(start = 0) {
    this.start = start;
    this.count = start;
  }

  increment(): number {
    this.count++;
    return this.count;
  }

  decrement(): number {
    this.count = Math.max(this.count - 1, 0);
    return this.count;
  }

  reset(): void {
    this.count = this.start;
  }
}

export class Temperature {
  celsius: number;

  constructor(celsius: number) {
    this.celsius = celsius;
  }

  toFahrenheit(): number {
    return (this.celsius * 9) / 5 + 32;
  }

  isFreezing(): boolean {
    return this.celsius <= 0;
  }

  label(): string {
    return `${this.celsius}℃`;
  }
}
