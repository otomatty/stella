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
  Play,
  Shield,
  Sparkles,
  Users,
  UserPlus,
} from "@/lib/icons";
import type { Role } from "@/data/types";
import type { ProfileRole } from "@stella/shared/cms/types";

type LucideIcon = ComponentType<LucideProps>;

export type NavId =
  | "library"
  | "dash"
  | "stages"
  | "lesson"
  | "cert"
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
  | "stage-grants"
  | "settings"
  | "__logout";

export interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  // 受講者のホームはスキルツリー (「次にやること」付き)。ステージ一覧と別ページの
  // スキルツリーはホームへ集約したので、先頭の 1 つで学習の入口が決まる。
  learner: [
    { id: "dash", label: "スキルツリー", icon: Compass },
    { id: "lesson", label: "現在のレッスン", icon: Play },
    { id: "cert", label: "修了証", icon: Award },
    // 本棚は本人だけの棚。staff (講師・管理者) は受講者画面に切り替えて使うので、staff のナビには出さない。
    { id: "library", label: "本棚", icon: Book },
  ],
  instructor: [
    { id: "dash", label: "ダッシュボード", icon: Home },
    { id: "review-queue", label: "レビュー", icon: Edit },
    { id: "gradebook", label: "成績台帳", icon: GraduationCap },
    { id: "students", label: "担当受講者", icon: Users },
    { id: "discovery", label: "発見教材", icon: Sparkles },
    { id: "stage-grants", label: "Extra 講座", icon: UserPlus },
    { id: "stages", label: "ステージ", icon: Book },
  ],
  admin: [
    { id: "dash", label: "KPIダッシュボード", icon: BarChart },
    { id: "stages", label: "ステージ管理", icon: Book },
    { id: "assignments", label: "課題管理", icon: Code },
    { id: "discovery", label: "発見教材", icon: Sparkles },
    // 人に回した提出・AI が合格にした提出の確認・見直しの数字 (#34)。管理者もレビューできる。
    { id: "review-queue", label: "レビュー", icon: Edit },
    { id: "enrollments", label: "受講状況", icon: ClipboardList },
    { id: "stage-grants", label: "Extra 講座", icon: UserPlus },
    { id: "gradebook", label: "成績台帳", icon: GraduationCap },
    { id: "users", label: "ユーザー管理", icon: Users },
    { id: "report", label: "レポート", icon: FileText },
    { id: "audit", label: "監査ログ", icon: Shield },
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
