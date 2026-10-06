/**
 * root の中のボタンを押すたびに、表示している数を 1 増やす。
 * @param {HTMLElement} root
 */
export function setupCounter(root) {
  const output = root.querySelector("output");
  const button = root.querySelector("button");
  let count = 0;
  button.addEventListener("click", () => {
    count += 1;
    // TODO: 増やした数を output に表示する
  });
}
