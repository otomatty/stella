import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) {
  throw new Error("週報を表示する要素が見つかりません");
}
createRoot(root).render(<App />);
