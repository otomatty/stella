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
