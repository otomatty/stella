import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Eye,
  Home,
  Book,
  Play,
  Award,
  Edit,
  Users,
  BarChart,
  Building,
  ClipboardList,
  FileText,
  Shield,
  Code,
  GraduationCap,
  MessageCircle,
} from "@/lib/icons";
import { Brand } from "@/components/common/Brand";
import { UserMenu } from "@/components/shell/UserMenu";
import type { Role, User } from "@/data/types";
import type { ProfileRole } from "@falcon/shared/cms/types";
import { staffHomeLabel } from "@/lib/ui-role";
import { cn } from "@/lib/utils";

type LucideIcon = ComponentType<LucideProps>;

type NavId =
  | "dash"
  | "courses"
  | "lesson"
  | "cert"
  | "interview-prep"
  | "review-queue"
  | "gradebook"
  | "students"
  | "users"
  | "enrollments"
  | "orgs"
  | "report"
  | "audit"
  | "assignments"
  | "settings"
  | "__logout";

interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
}

// バッジ件数はモック値を持たず、 App から実データ (counts prop) で渡す。
const NAV: Record<Role, NavItem[]> = {
  learner: [
    { id: "dash", label: "ダッシュボード", icon: Home },
    { id: "courses", label: "コース一覧", icon: Book },
    { id: "lesson", label: "現在のレッスン", icon: Play },
    { id: "interview-prep", label: "面談対策", icon: MessageCircle },
    { id: "cert", label: "修了証", icon: Award },
  ],
  instructor: [
    { id: "dash", label: "ダッシュボード", icon: Home },
    { id: "review-queue", label: "添削待ち", icon: Edit },
    { id: "gradebook", label: "成績台帳", icon: GraduationCap },
    { id: "students", label: "担当受講者", icon: Users },
    { id: "interview-prep", label: "面談対策", icon: MessageCircle },
    { id: "courses", label: "コース", icon: Book },
  ],
  admin: [
    { id: "dash", label: "KPIダッシュボード", icon: BarChart },
    { id: "courses", label: "コース管理", icon: Book },
    { id: "assignments", label: "課題管理", icon: Code },
    { id: "enrollments", label: "受講登録", icon: ClipboardList },
    { id: "gradebook", label: "成績台帳", icon: GraduationCap },
    { id: "users", label: "ユーザー管理", icon: Users },
    { id: "report", label: "レポート", icon: FileText },
    { id: "audit", label: "監査ログ", icon: Shield },
  ],
};

const ORGS_NAV: NavItem = { id: "orgs", label: "組織マスタ", icon: Building };

function navForRole(role: Role, profileRole?: ProfileRole): NavItem[] {
  const items = NAV[role];
  if (role !== "admin" || profileRole !== "platform_admin") return items;
  const usersIdx = items.findIndex((item) => item.id === "users");
  const insertAt = usersIdx >= 0 ? usersIdx + 1 : items.length;
  return [...items.slice(0, insertAt), ORGS_NAV, ...items.slice(insertAt)];
}

interface SidebarProps {
  role: Role;
  page: string;
  setPage: (page: string) => void;
  user: User;
  /** ナビ ID ごとの実件数バッジ (添削待ち / 修了証 等)。 0 は非表示。 */
  counts?: Partial<Record<NavId, number>>;
  /** profiles.role — 組織マスタは platform_admin のみ表示 */
  profileRole?: ProfileRole;
  canSwitchToLearner?: boolean;
  onSwitchToLearner?: () => void;
  onReturnToStaff?: () => void;
}

export const Sidebar = ({
  role,
  page,
  setPage,
  user,
  counts,
  profileRole,
  canSwitchToLearner,
  onSwitchToLearner,
  onReturnToStaff,
}: SidebarProps) => (
  // h-dvh: モバイルブラウザでは 100vh がアドレスバー分だけ実表示領域より大きく、
  // h-screen だと下端のビュー切替 / ユーザーメニューが画面外に隠れてしまう。
  <aside className="bg-card border-r border-border px-3 pb-4 flex flex-col gap-0.5 sticky top-0 h-dvh overflow-y-auto w-[min(84vw,236px)] lg:w-[236px]">
    <div className="-mx-3 mb-3 flex h-[var(--shell-header-height)] items-center border-b border-border px-5">
      <Brand size="sm" />
    </div>

    <div className="px-3.5 pt-2.5 pb-2 font-display text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-4">
      Menu
    </div>
    {navForRole(role, profileRole).map((link) => {
      const count = counts?.[link.id];
      return (
        <SidebarLink
          key={link.id}
          icon={link.icon}
          label={link.label}
          count={typeof count === "number" && count > 0 ? count : undefined}
          active={page === link.id}
          onClick={() => setPage(link.id)}
        />
      );
    })}

    {/* 受講者画面との切り替えはユーザーメニューの中だけだと気付けないため、
        ナビ直下にも常時見える導線として出す (ドロワーでも同じ位置に出る)。 */}
    {canSwitchToLearner ? (
      <div className="mt-auto pt-2.5">
        <ViewSwitch
          viewingAsLearner={role === "learner"}
          profileRole={profileRole}
          onSwitchToLearner={onSwitchToLearner}
          onReturnToStaff={onReturnToStaff}
        />
      </div>
    ) : null}

    {/* 「設定」「ログアウト」はユーザーメニュー (アバター) 側に集約している。 */}
    <div className={cn("pt-2.5 border-t border-border", canSwitchToLearner ? "mt-2.5" : "mt-auto")}>
      <UserMenu
        user={user}
        onOpenSettings={() => setPage("settings")}
        onLogout={() => setPage("__logout")}
        canSwitchToLearner={canSwitchToLearner}
        viewingAsLearner={role === "learner"}
        profileRole={profileRole}
        onSwitchToLearner={onSwitchToLearner}
        onReturnToStaff={onReturnToStaff}
      />
    </div>
  </aside>
);

/**
 * 受講者画面 ⇄ スタッフ画面の切替。 staff (instructor / admin / platform_admin) だけに出る。
 * 受講者画面を表示中は「今どちらを見ているか」が分かるよう強調して戻り導線を出す。
 */
const ViewSwitch = ({
  viewingAsLearner,
  profileRole,
  onSwitchToLearner,
  onReturnToStaff,
}: {
  viewingAsLearner: boolean;
  profileRole?: ProfileRole;
  onSwitchToLearner?: () => void;
  onReturnToStaff?: () => void;
}) =>
  viewingAsLearner ? (
    <div className="rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand">
        <Eye size={13} className="shrink-0" />
        受講者画面を表示中
      </div>
      <button
        type="button"
        onClick={onReturnToStaff}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-bold text-card transition-colors hover:opacity-90"
      >
        <GraduationCap size={13} className="shrink-0" />
        {staffHomeLabel(profileRole)}
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={onSwitchToLearner}
      className="flex w-full items-center gap-2.5 rounded-full border border-border-2 px-3.5 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:border-border-strong hover:bg-sunken hover:text-foreground"
    >
      <Eye size={15} className="shrink-0" />
      <span className="flex-1 truncate text-left">受講者画面を表示</span>
    </button>
  );

interface SidebarLinkProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

const SidebarLink = ({ icon: Icon, label, count, active, onClick }: SidebarLinkProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[13px] cursor-pointer select-none text-left",
      "transition-colors",
      active
        ? "bg-ink text-card font-bold"
        : "text-ink-2 font-medium hover:bg-sunken hover:text-foreground",
    )}
  >
    <Icon size={15} className="shrink-0" />
    <span className="flex-1 truncate">{label}</span>
    {typeof count === "number" ? (
      <span
        className={cn(
          "ml-auto text-[11px] px-[7px] py-[1px] rounded-full font-bold",
          active ? "bg-card/20 text-card" : "bg-muted text-ink-2",
        )}
      >
        {count}
      </span>
    ) : null}
  </button>
);
