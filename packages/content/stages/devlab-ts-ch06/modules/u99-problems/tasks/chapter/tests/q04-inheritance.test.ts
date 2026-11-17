import { describe, expect, expectTypeOf, test } from "vitest";
import { Employee, Manager, countManagers, payroll } from "../src/q04-inheritance";

describe("Employee", () => {
  test("説明と年収", () => {
    const employee = new Employee("山田", 300000);
    expect(employee.name).toBe("山田");
    expect(employee.describe()).toBe("山田（月給 300,000円）");
    expect(employee.annualSalary()).toBe(3600000);
  });

  test("名前と月給は書き換えられない", () => {
    const employee = new Employee("山田", 300000);
    // @ts-expect-error name は読み取り専用
    employee.name = "佐藤";
    // @ts-expect-error salary は読み取り専用
    employee.salary = 1;
  });

  test("型", () => {
    expectTypeOf(Employee).constructorParameters.toEqualTypeOf<[name: string, salary: number]>();
    expectTypeOf<Employee["describe"]>().toEqualTypeOf<() => string>();
    expectTypeOf<Employee["annualSalary"]>().toEqualTypeOf<() => number>();
  });
});

describe("Manager", () => {
  test("親の説明に部下の人数を足す", () => {
    const manager = new Manager("佐藤", 500000, 5);
    expect(manager.describe()).toBe("佐藤（月給 500,000円）・部下 5人");
    expect(manager.teamSize).toBe(5);
  });

  test("年収に賞与を足す", () => {
    expect(new Manager("佐藤", 500000, 5).annualSalary()).toBe(7000000);
  });

  test("Manager は Employee でもある", () => {
    const manager = new Manager("佐藤", 500000, 5);
    expect(manager).toBeInstanceOf(Employee);
    const asEmployee: Employee = manager;
    expect(asEmployee.annualSalary()).toBe(7000000);
  });

  test("型", () => {
    expectTypeOf(Manager).constructorParameters.toEqualTypeOf<
      [name: string, salary: number, teamSize: number]
    >();
    expectTypeOf<Manager["teamSize"]>().toEqualTypeOf<number>();
  });
});

describe("payroll と countManagers", () => {
  const staff = (): Employee[] => [
    new Employee("山田", 300000),
    new Manager("佐藤", 500000, 5),
    new Employee("鈴木", 250000),
  ];

  test("年収の合計", () => {
    expect(payroll(staff())).toBe(3600000 + 7000000 + 3000000);
    expect(payroll([])).toBe(0);
  });

  test("Manager の人数", () => {
    expect(countManagers(staff())).toBe(1);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(payroll).parameters.toEqualTypeOf<[readonly Employee[]]>();
    expectTypeOf(payroll).returns.toEqualTypeOf<number>();
    expectTypeOf(countManagers).parameters.toEqualTypeOf<[readonly Employee[]]>();
    expectTypeOf(countManagers).returns.toEqualTypeOf<number>();
  });
});
