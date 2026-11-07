// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問11
export function firstIndexOver(numbers: readonly number[], limit: number): number {
  let found = -1;
  let i = 0;
  while (i < numbers.length) {
    if ((numbers[i] ?? -Infinity) > limit) {
      found = i;
      break;
    }
    i++;
  }
  return found;
}
