export type Nullable<T> = { [K in keyof T]: T[K] | null };
export type Flags<T> = { [K in keyof T]: boolean };
export type Getters<T> = { [K in keyof T]: () => T[K] };

export function allFlags<T extends object>(obj: T, value: boolean): Flags<T> {
  const result: Partial<Flags<T>> = {};
  for (const key of Object.keys(obj)) {
    result[key as keyof T] = value;
  }
  return result as Flags<T>;
}

export function toNullable<T extends object>(obj: T): Nullable<T> {
  return { ...obj };
}
