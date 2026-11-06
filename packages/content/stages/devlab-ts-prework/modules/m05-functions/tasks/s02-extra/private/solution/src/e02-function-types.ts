export type NumberFn = (x: number) => number;

export function compose(f: NumberFn, g: NumberFn): NumberFn {
  return (x) => g(f(x));
}

export function pipe(...fns: NumberFn[]): NumberFn {
  return (x) => {
    let value = x;
    for (const fn of fns) {
      value = fn(value);
    }
    return value;
  };
}

export function repeatFn(fn: NumberFn, times: number): NumberFn {
  return (x) => {
    let value = x;
    for (let i = 0; i < times; i++) {
      value = fn(value);
    }
    return value;
  };
}
