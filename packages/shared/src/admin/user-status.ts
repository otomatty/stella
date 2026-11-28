import { studyDateStartMs } from "../study/activity.js";

export type UserStatus =
  | { kind: "idle"; days: number }
  | { kind: "stumble" }
  | { kind: "pending_review"; count: number }
  | { kind: "new" }
  | { kind: "admin" }
  | { kind: "ok" };

export interface UserStatusInput {
  role: "student" | "admin";
  today: string;
  registeredDate: string;
  lastStudyDate: string | null;
  hasActiveEnrollment: boolean;
  level: number;
  stumbleSignals: readonly string[];
  pendingReviews: number;
}

export function deriveUserStatus(input: UserStatusInput): UserStatus {
  const today = studyDateStartMs(input.today);
  const registered = studyDateStartMs(input.registeredDate);
  const lastStudy =
    input.lastStudyDate === null ? registered : studyDateStartMs(input.lastStudyDate);
  const idleDays = (today - lastStudy) / 86_400_000;
  if (input.role === "student" && input.hasActiveEnrollment && idleDays >= 7)
    return { kind: "idle", days: idleDays };
  if (input.stumbleSignals.length > 0) return { kind: "stumble" };
  if (input.pendingReviews > 0) return { kind: "pending_review", count: input.pendingReviews };
  const registeredDays = (today - registered) / 86_400_000;
  if (registeredDays >= 0 && registeredDays <= 14 && input.level === 1) return { kind: "new" };
  return { kind: input.role === "admin" ? "admin" : "ok" };
}

export function userStatusLabel(status: UserStatus): string {
  switch (status.kind) {
    case "idle":
      return `${status.days}日 学習なし`;
    case "stumble":
      return "つまずき";
    case "pending_review":
      return `確認待ち ${status.count}件`;
    case "new":
      return "はじめたばかり";
    case "admin":
      return "管理者";
    case "ok":
      return "順調";
  }
}

export function userStatusNeedsFollowUp(status: UserStatus): boolean {
  return status.kind === "idle" || status.kind === "stumble";
}
