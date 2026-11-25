// 問題
// function first<T>(items: readonly T[]): T | undefined のように、型を引数のように受け取る（型変数 T）と、
// どんな型の配列にも使え、しかも戻り値の型が「渡した配列の要素の型」になる関数を書けます。
// 次の関数と型を、型変数を使って書いてください。any や unknown で逃げないこと。
//
// 1. first(items)   最初の要素を返す。空なら undefined
// 2. last(items)    最後の要素を返す。空なら undefined
// 3. repeat(value, times)  value を times 個並べた配列を返す
// 4. pair(a, b)     [a, b] のタプルを返す。a と b は別々の型でよい（型変数を2つ使う）
// 5. 型 Box<T>（{ value: T }）を定義して export し、box(value) で Box を作り、unbox(box) で中の値を返す
//
// どの関数も、テストは「数値の配列なら number、文字列の配列なら string」のように、
// 渡した型に合わせて戻り値の型が変わるかを確かめます
// first と last の配列の引数は readonly T[] にします。

export function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

export function repeat<T>(value: T, times: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < times; i++) {
    result.push(value);
  }
  return result;
}

export function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

export type Box<T> = { value: T };

export function box<T>(value: T): Box<T> {
  return { value };
}

export function unbox<T>(box: Box<T>): T {
  return box.value;
}
