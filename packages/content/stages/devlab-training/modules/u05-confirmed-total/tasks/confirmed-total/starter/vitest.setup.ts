import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// テストごとに、表示した部品を片付ける。
afterEach(() => {
  cleanup();
});
