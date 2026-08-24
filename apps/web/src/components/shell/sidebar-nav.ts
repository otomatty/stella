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
  Code,
  Edit,
  FileText,
  GraduationCap,
  Home,
  MessageCircle,
  Play,
  Shield,
  Users,
} from "@/lib/icons";
import type { Role } from "@/data/types";
import type { ProfileRole } from "@falcon/shared/cms/types";

type LucideIcon = ComponentType<LucideProps>;

export type NavId =
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

export interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
}

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
