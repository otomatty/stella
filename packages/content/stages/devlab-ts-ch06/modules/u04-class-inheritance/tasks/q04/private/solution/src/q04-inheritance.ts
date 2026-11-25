// 問題
// 1. 社員を表すクラス Employee を書いてください
//    - constructor(name, salary): 名前と月給。どちらも読み取り専用のフィールドにする
//    - describe(): "山田（月給 300,000円）" の形の文字列を返す
//    - annualSalary(): 年収（月給 × 12）を返す
//
// 2. Employee を継承した（extends Employee）クラス Manager を書いてください
//    - constructor(name, salary, teamSize): super(name, salary) を呼び、部下の人数 teamSize をフィールドにする
//    - describe(): 親の describe() の後ろに "・部下 5人" を足す。super.describe() を使う
//    - annualSalary(): 親の年収に、賞与として月給 × 2 を足す
//    親のメソッドを上書きするときは override を付けること（付けないと型エラーになる設定にしてある）
//
// 3. payroll(employees): 全員の年収の合計を返す。引数は readonly Employee[]。
//    Manager が混ざっていても、それぞれのクラスの annualSalary が呼ばれる
//
// 4. countManagers(employees): Manager の人数を返す。instanceof を使う

export class Employee {
  constructor(
    readonly name: string,
    readonly salary: number,
  ) {}

  describe(): string {
    return `${this.name}（月給 ${this.salary.toLocaleString("ja-JP")}円）`;
  }

  annualSalary(): number {
    return this.salary * 12;
  }
}

export class Manager extends Employee {
  constructor(
    name: string,
    salary: number,
    readonly teamSize: number,
  ) {
    super(name, salary);
  }

  override describe(): string {
    return `${super.describe()}・部下 ${this.teamSize}人`;
  }

  override annualSalary(): number {
    return super.annualSalary() + this.salary * 2;
  }
}

export function payroll(employees: readonly Employee[]): number {
  let total = 0;
  for (const employee of employees) {
    total += employee.annualSalary();
  }
  return total;
}

export function countManagers(employees: readonly Employee[]): number {
  return employees.filter((employee) => employee instanceof Manager).length;
}
