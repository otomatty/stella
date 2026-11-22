/** 文が設計より短いときは、文の開始から動き出すまでの間隔を縮める。 */
export function beatClock(
  beats: readonly { start: number; end: number }[],
  seconds: readonly number[],
) {
  return (i: number, offset = 0) => {
    const { start, end } = beats[i];
    const scale = offset < 0 ? 1 : Math.min(1, (end - start) / seconds[i]);
    return Math.max(0, start + offset * scale);
  };
}
