import { useState } from "react";

/**
 * ボタンを押すたびに数を 1 増やして表示する。
 * @param {{ initial?: number }} props
 */
export function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);
  return (
    <section>
      <h1>カウンター</h1>
      <output aria-label="現在の数">{count}</output>
      <button type="button" onClick={() => setCount(count)}>
        1 増やす
      </button>
    </section>
  );
}
