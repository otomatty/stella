// 問1
export function makeAdder(n: number): (x: number) => number {
  return (x) => x + n;
}

// 問2
export function makeTimes(n: number): (x: number) => number {
  return (x) => x * n;
}

// 問3
export function makeGreeter(greeting: string): (name: string) => string {
  return (name) => `${greeting}、${name}さん`;
}

// 問4
export function makeCounter(): () => number {
  let count = 0;
  return () => {
    count++;
    return count;
  };
}

// 問5
export function makeCounterFrom(start: number): () => number {
  let current = start;
  return () => {
    const value = current;
    current++;
    return value;
  };
}

// 問6
export function makeToggle(initial: boolean): () => boolean {
  let state = initial;
  return () => {
    state = !state;
    return state;
  };
}

// 問7
export function makeAccumulator(): (n: number) => number {
  let total = 0;
  return (n) => {
    total += n;
    return total;
  };
}

// 問8
export function makeIdMaker(prefix: string): () => string {
  let count = 0;
  return () => {
    count++;
    return `${prefix}${count}`;
  };
}

// 問9
export function onlyOnce(fn: () => number): () => number {
  let called = false;
  let result = 0;
  return () => {
    if (!called) {
      result = fn();
      called = true;
    }
    return result;
  };
}

// 問10
export function makeLimiter(max: number): () => boolean {
  let used = 0;
  return () => {
    used++;
    return used <= max;
  };
}

// 問11
export function makeHistory(): { add: (text: string) => void; list: () => string[] } {
  const items: string[] = [];
  return {
    add: (text) => {
      items.push(text);
    },
    list: () => [...items],
  };
}

// 問12
export function makeStack(): {
  push: (n: number) => void;
  pop: () => number | undefined;
  size: () => number;
} {
  const items: number[] = [];
  return {
    push: (n) => {
      items.push(n);
    },
    pop: () => items.pop(),
    size: () => items.length,
  };
}

// 問13
export function makeSquareCache(): { square: (n: number) => number; computed: () => number } {
  const cache: { [key: string]: number } = {};
  let count = 0;
  return {
    square: (n) => {
      const key = String(n);
      const cached = cache[key];
      if (cached !== undefined) {
        return cached;
      }
      count++;
      const value = n * n;
      cache[key] = value;
      return value;
    },
    computed: () => count,
  };
}

// 問14
export function makeCycler(items: readonly string[]): () => string {
  if (items.length === 0) {
    throw new Error("空の配列です");
  }
  let index = 0;
  return () => {
    const item = items[index % items.length] ?? "";
    index++;
    return item;
  };
}

// 問15
export function makeWallet(initial: number): {
  deposit: (n: number) => number;
  withdraw: (n: number) => number;
  balance: () => number;
} {
  let money = initial;
  return {
    deposit: (n) => {
      money += n;
      return money;
    },
    withdraw: (n) => {
      if (n > money) {
        throw new Error("残高が足りません");
      }
      money -= n;
      return money;
    },
    balance: () => money,
  };
}

// 問16
export function makeFormatter(unit: string): (n: number) => string {
  return (n) => `${n}${unit}`;
}

// 問17
export function makeValidator(min: number, max: number): (n: number) => boolean {
  return (n) => n >= min && n <= max;
}

// 問18
export function makeLapTimer(): (t: number) => number {
  let last = 0;
  return (t) => {
    const lap = t - last;
    last = t;
    return lap;
  };
}

// 問19
export function partial(fn: (a: number, b: number) => number, a: number): (b: number) => number {
  return (b) => fn(a, b);
}

// 問20
export function makeTagger(tag: string): (text: string) => string {
  return (text) => `<${tag}>${text}</${tag}>`;
}
