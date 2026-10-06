import "@testing-library/jest-dom/vitest";
import { setProjectAnnotations } from "@storybook/react-vite";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import preview from "./.storybook/preview.js";

// 状態見本に、Storybook と同じ全体設定 (.storybook/preview.js) を当てる。
setProjectAnnotations([preview]);

// テストごとに、表示した部品を片付ける。
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});
