/**
 * Sidebar — shadcn/ui の Sidebar を参考にした自前実装のまとめ役。
 *
 * 使い方 (最小):
 * ```tsx
 * <SidebarProvider defaultOpen={false}>
 *   <Sidebar collapsible="offcanvas">
 *     <SidebarHeader>…</SidebarHeader>
 *     <SidebarContent>
 *       <SidebarGroup>
 *         <SidebarGroupLabel>Menu</SidebarGroupLabel>
 *         <SidebarMenu>
 *           <SidebarMenuItem>
 *             <SidebarMenuButton isActive>ダッシュボード</SidebarMenuButton>
 *           </SidebarMenuItem>
 *         </SidebarMenu>
 *       </SidebarGroup>
 *     </SidebarContent>
 *     <SidebarFooter>…</SidebarFooter>
 *   </Sidebar>
 *   <SidebarInset>
 *     <SidebarTrigger />
 *     …本文…
 *   </SidebarInset>
 * </SidebarProvider>
 * ```
 */

export {
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  type SidebarContextValue,
  type SidebarState,
  useSidebar,
} from "./sidebar-context";
export { SidebarProvider, type SidebarProviderProps } from "./sidebar-provider";
export { Sidebar, type SidebarProps } from "./sidebar";
export { SidebarRail, SidebarTrigger, type SidebarTriggerProps } from "./sidebar-trigger";
export { SidebarInset } from "./sidebar-inset";
export {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "./sidebar-sections";
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  type SidebarMenuButtonProps,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  type SidebarMenuSubButtonProps,
  SidebarMenuSubItem,
} from "./sidebar-menu";
export {
  SIDEBAR_STORAGE_KEY,
  parseSidebarOpen,
  readSidebarOpen,
  writeSidebarOpen,
} from "./sidebar-storage";
