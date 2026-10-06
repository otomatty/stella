import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// テストごとに画面を空に戻す。
afterEach(() => {
  document.body.innerHTML = "";
});
