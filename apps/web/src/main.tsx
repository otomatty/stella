import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AppErrorScreen } from "./components/common/AppErrorScreen";
import { NotFoundScreen } from "./components/common/NotFoundScreen";
import "./index.css";

const router = createRouter({
  routeTree,
  // ページ内で throw された例外は最も近い (= リーフルートの) 境界で捕捉されるため、
  // AppShell の枠を保ったままエラー画面に差し替わる。
  defaultErrorComponent: AppErrorScreen,
  defaultNotFoundComponent: NotFoundScreen,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
