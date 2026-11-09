// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Schedule } from "../src/q05-02-schedule";
test("問2 Schedule", () => {
  expectTypeOf<Schedule>().toEqualTypeOf<{
    mon: string[];
    tue: string[];
    wed: string[];
    thu: string[];
    fri: string[];
  }>();
});
