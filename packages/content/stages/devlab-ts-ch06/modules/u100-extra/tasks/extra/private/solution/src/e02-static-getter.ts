// 問題
// 1. 温度を表すクラス Temperature を書いてください
//    - constructor(celsius): 摂氏を private に持つ
//    - get fahrenheit(): 華氏を返す（temperature.fahrenheit のように、() なしで読める）
//    - set fahrenheit(value): 華氏で受け取り、摂氏に直して持つ
//    - get celsius(): 摂氏を返す
//    - static fromFahrenheit(value): 華氏から Temperature を作って返す（new しなくても Temperature.fromFahrenheit(…) で呼べる）
//    - static created: これまでに作られた Temperature の数（static フィールド。constructor で1増やす）
//
// 2. 文字列を組み立てるクラス QueryBuilder を書いてください
//    - where(condition): 条件を足して this を返す（戻り値の型は this）
//    - limit(n): 件数を決めて this を返す
//    - build(): "WHERE a AND b LIMIT 10" の形の文字列を返す。条件がなければ WHERE を、件数がなければ LIMIT を付けない
//    例: new QueryBuilder().where("age > 20").where("active").limit(10).build()
//        → "WHERE age > 20 AND active LIMIT 10"

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
