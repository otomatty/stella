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
