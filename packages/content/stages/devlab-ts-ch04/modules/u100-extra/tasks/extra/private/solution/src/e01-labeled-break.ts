// ラベルを使わないなら、内側で見つけたときにすぐ return する。ループを別の関数に切り出すと書きやすい
export function findPair(numbers: readonly number[], target: number): [number, number] | undefined {
  let found: [number, number] | undefined;
  outer: for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      if ((numbers[i] ?? 0) + (numbers[j] ?? 0) === target) {
        found = [i, j];
        break outer;
      }
    }
  }
  return found;
}

export function findInGrid(
  grid: readonly (readonly number[])[],
  value: number,
): [number, number] | undefined {
  let found: [number, number] | undefined;
  outer: for (const [row, cells] of grid.entries()) {
    for (const [col, cell] of cells.entries()) {
      if (cell === value) {
        found = [row, col];
        break outer;
      }
    }
  }
  return found;
}
