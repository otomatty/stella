// 問13 型 ClickHandler を、関数 handleClick の型として作る（typeof handleClick）
// 定義済みの関数は書き換えません。

export function handleClick(x: number, y: number): string {
  return `${x},${y}`;
}

export type ClickHandler = typeof handleClick;
