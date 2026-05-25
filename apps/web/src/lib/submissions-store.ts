/**
 * 提出物の localStorage 永続化 (Issue #8 — 講師添削ワークフロー)。
 *
 * Supabase 未設定 / デモモードではここが真実のソース。
 * Tweaks パネルでのロール切替時もテナント別に分離する。
 */

import type { Submission, ReviewVerdict } from "@falcon/shared/review/types";
import {
  REVIEW_QUEUE,
  SUBMITTED_CODE,
  AI_SUGGESTIONS,
  RUBRIC,
} from "@/data/fixtures";
import type { Tenant } from "@/data/types";

const STORAGE_KEY = "lms_submissions_v1";

type StoreV1 = {
  version: 1;
  byTenant: Record<string, Submission[]>;
};

let cache: StoreV1 | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function loadStore(): StoreV1 {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = { version: 1, byTenant: {} };
    return cache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreV1;
      if (parsed?.version === 1 && parsed.byTenant) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    /* ignore */
  }
  cache = { version: 1, byTenant: {} };
  return cache;
}

function saveStore(store: StoreV1) {
  cache = store;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("[submissions-store] save failed", err);
  }
  emit();
}

function relativeSubmittedAt(ms: number): string {
  const diff = Date.now() - ms;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "1時間以内";
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨日";
  return `${days}日前`;
}

function seedForTenant(tenantId: Tenant["id"]): Submission[] {
  const now = Date.now();
  return REVIEW_QUEUE.map((r, idx) => {
    const hoursAgo = (idx + 1) * 2;
    const submittedAt = now - hoursAgo * 3_600_000;
    const isFirst = r.id === "r1";
    return {
      id: r.id,
      tenantId,
      studentName: r.student,
      studentInitials: r.initials,
      avatarTone: r.c,
      courseTitle: r.course,
      assignmentTitle: r.assignment,
      codeLines: isFirst ? [...SUBMITTED_CODE] : [`// ${r.assignment} — ${r.student}`, "// (デモ提出コード)", ""],
      submittedAt,
      status: "pending" as const,
      priority: r.priority,
      attempt: r.assignment.includes("再提出") ? 2 : 1,
      aiReady: r.aiReady,
      aiSuggestions: isFirst && r.aiReady ? AI_SUGGESTIONS.map((s) => ({ ...s })) : [],
      rubric: isFirst && r.aiReady ? RUBRIC.map((x) => ({ ...x })) : [],
      reviewNotes: isFirst
        ? "コードは動作していますが、innerHTML による XSS リスクと等価演算子の使い方に改善の余地があります。"
        : "",
      verdict: null,
    };
  });
}

function ensureTenant(tenantId: Tenant["id"]): Submission[] {
  const store = loadStore();
  if (!store.byTenant[tenantId]?.length) {
    store.byTenant[tenantId] = seedForTenant(tenantId);
    saveStore(store);
  }
  return store.byTenant[tenantId];
}

export function listSubmissions(tenantId: Tenant["id"]): Submission[] {
  return [...ensureTenant(tenantId)].sort((a, b) => b.submittedAt - a.submittedAt);
}

export function getSubmission(
  tenantId: Tenant["id"],
  id: string,
): Submission | undefined {
  return ensureTenant(tenantId).find((s) => s.id === id);
}

export function updateSubmission(
  tenantId: Tenant["id"],
  id: string,
  patch: Partial<Submission>,
): Submission | undefined {
  const store = loadStore();
  const list = ensureTenant(tenantId);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], ...patch };
  store.byTenant[tenantId] = list;
  saveStore(store);
  return list[idx];
}

export function createSubmission(
  tenantId: Tenant["id"],
  input: Omit<
    Submission,
    | "id"
    | "tenantId"
    | "submittedAt"
    | "status"
    | "aiReady"
    | "aiSuggestions"
    | "rubric"
    | "reviewNotes"
    | "verdict"
    | "attempt"
    | "priority"
  > & { priority?: Submission["priority"]; attempt?: number },
): Submission {
  const store = loadStore();
  const list = ensureTenant(tenantId);
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const submission: Submission = {
    id,
    tenantId,
    submittedAt: Date.now(),
    status: "pending",
    aiReady: false,
    aiSuggestions: [],
    rubric: [],
    reviewNotes: "",
    verdict: null,
    priority: input.priority ?? "normal",
    attempt: input.attempt ?? 1,
    ...input,
  };
  list.unshift(submission);
  store.byTenant[tenantId] = list;
  saveStore(store);
  return submission;
}

export function finalizeReview(
  tenantId: Tenant["id"],
  id: string,
  verdict: ReviewVerdict,
  patch: {
    reviewNotes: string;
    aiSuggestions: Submission["aiSuggestions"];
    rubric: Submission["rubric"];
  },
): Submission | undefined {
  const status =
    verdict === "pass" ? "passed" : verdict === "fail" ? "failed" : "resubmit";
  return updateSubmission(tenantId, id, {
    ...patch,
    verdict,
    status,
  });
}

export function formatSubmittedAt(ms: number): string {
  return relativeSubmittedAt(ms);
}

export function countPending(tenantId: Tenant["id"]): number {
  return ensureTenant(tenantId).filter((s) => s.status === "pending").length;
}

export function subscribeSubmissions(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
