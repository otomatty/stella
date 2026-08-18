import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { NotFoundScreen } from "@/components/common/NotFoundScreen";
import { AppErrorScreen } from "@/components/common/AppErrorScreen";

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  // 公開ルート (/support, /verify/...) 側で notFound() が投げられたときの受け皿。
  // 認証済みシェル内の未知 URL は `_app/$` が拾い、 サイドバー付きで 404 を出す。
  notFoundComponent: NotFoundScreen,
  errorComponent: AppErrorScreen,
});
