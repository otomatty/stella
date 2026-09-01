/**
 * サイドバーのナビ定義。 ロールごとの並びと、 権限による出し分けだけを持つ。
 *
 * 見た目 (`AppSidebar`) と分けているのは、 「どのロールに何を見せるか」だけを
 * 読みたい / 変えたい場面が多いため。 バッジ件数はここに持たず、
 * AppShell が実データ (counts) を渡す。
 */

import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Award,
  BarChart,
  Book,
  Building,
  ClipboardList,
  Compass,
  Code,
  Edit,
  FileText,
  GraduationCap,
  Home,
  MessageCircle,
  Play,
  Shield,
  Sparkles,
  Star,
  Users,
  UserPlus,
} from "@/lib/icons";
import type { Role } from "@/data/types";
import type { ProfileRole } from "@falcon/shared/cms/types";

type LucideIcon = ComponentType<LucideProps>;

export type NavId =
  | "dash"
  | "stages"
  | "skill-tree"
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
  | "discovery"
  | "hall-of-fame"
  | "hall-of-fame-admin"
  | "stage-grants"
  | "settings"
  | "__logout";

export interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
}

/**
 * 殿堂 (Phase 5)。 **一覧の最後に置く**。
 *
 * 毎日の学習動線 (ダッシュボード → ステージ → レッスン) の途中に挟むと、 他人の
 * 物語が「今日やること」の並びに混ざる。 いつでも行けるが、 急かさない位置に置く。
 * 営業には出さない (受講者の物語を売り物の資料として扱わせない — 読めはする)。
 */
const HALL_OF_FAME_NAV: NavItem = { id: "hall-of-fame", label: "殿堂", icon: Star };

const NAV: Record<Role, NavItem[]> = {
  learner: [
    { id: "dash", label: "ダッシュボード", icon: Home },
    { id: "stages", label: "ステージ一覧", icon: Book },
    { id: "skill-tree", label: "スキルツリー", icon: Compass },
    { id: "lesson", label: "現在のレッスン", icon: Play },
    { id: "interview-prep", label: "面談対策", icon: MessageCircle },
    { id: "cert", label: "修了証", icon: Award },
    HALL_OF_FAME_NAV,
  ],
  instructor: [
    { id: "dash", label: "ダッシュボード", icon: Home },
    { id: "review-queue", label: "添削待ち", icon: Edit },
    { id: "gradebook", label: "成績台帳", icon: GraduationCap },
    { id: "students", label: "担当受講者", icon: Users },
    { id: "discovery", label: "発見教材", icon: Sparkles },
    { id: "stage-grants", label: "専用教材", icon: UserPlus },
    { id: "interview-prep", label: "面談対策", icon: MessageCircle },
    { id: "stages", label: "ステージ", icon: Book },
    HALL_OF_FAME_NAV,
  ],
  admin: [
    { id: "dash", label: "KPIダッシュボード", icon: BarChart },
    { id: "stages", label: "ステージ管理", icon: Book },
    { id: "assignments", label: "課題管理", icon: Code },
    { id: "discovery", label: "発見教材", icon: Sparkles },
    { id: "enrollments", label: "受講状況", icon: ClipboardList },
    { id: "stage-grants", label: "専用教材", icon: UserPlus },
    { id: "gradebook", label: "成績台帳", icon: GraduationCap },
    { id: "interview-prep", label: "面談対策", icon: MessageCircle },
    { id: "users", label: "ユーザー管理", icon: Users },
    { id: "report", label: "レポート", icon: FileText },
    { id: "audit", label: "監査ログ", icon: Shield },
    // 管理者の「殿堂」は運用画面 (推薦 / 公開)。 掲載そのものは運用画面から見に行ける。
    { id: "hall-of-fame-admin", label: "殿堂", icon: Star },
  ],
  sales: [
    { id: "dash", label: "ダッシュボード", icon: Home },
    { id: "interview-prep", label: "面談対策", icon: MessageCircle },
  ],
};

const ORGS_NAV: NavItem = { id: "orgs", label: "組織マスタ", icon: Building };

/** 表示するナビ項目。 組織マスタは platform_admin のみ、 ユーザー管理の直後に挿す。 */
export function navForRole(role: Role, profileRole?: ProfileRole): NavItem[] {
  const items = NAV[role];
  if (role !== "admin" || profileRole !== "platform_admin") return items;
  const usersIdx = items.findIndex((item) => item.id === "users");
  const insertAt = usersIdx >= 0 ? usersIdx + 1 : items.length;
  return [...items.slice(0, insertAt), ORGS_NAV, ...items.slice(insertAt)];
}
