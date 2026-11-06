export class Temperature {
  static created = 0;

  constructor(private celsiusValue: number) {
    Temperature.created++;
  }

  static fromFahrenheit(value: number): Temperature {
    return new Temperature(((value - 32) * 5) / 9);
  }

  get celsius(): number {
    return this.celsiusValue;
  }

  get fahrenheit(): number {
    return (this.celsiusValue * 9) / 5 + 32;
  }

  set fahrenheit(value: number) {
    this.celsiusValue = ((value - 32) * 5) / 9;
  }
}

export class QueryBuilder {
  private conditions: string[] = [];
  private count: number | undefined;

  where(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  limit(n: number): this {
    this.count = n;
    return this;
  }

  build(): string {
    const parts: string[] = [];
    if (this.conditions.length > 0) {
      parts.push(`WHERE ${this.conditions.join(" AND ")}`);
    }
    if (this.count !== undefined) {
      parts.push(`LIMIT ${this.count}`);
    }
    return parts.join(" ");
  }
}
