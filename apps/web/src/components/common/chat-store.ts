/**
 * 課題ごとの AI チャット履歴を localStorage に永続化する薄いラッパ。
 *
 * - キー: `jsreview/chat/{assignmentId}`
 * - 値:   JSON シリアライズされた `StoredChat`
 * - スキーマ変更に備えてバージョンキーを別途保持し、不一致なら全削除
 * - QuotaExceeded 時は他課題のチャットを古い順に削除して再試行
 * - 課題ごとに最新 `MAX_MESSAGES_PER_ASSIGNMENT` 件にキャップ
 */

import type { ChatMessage } from "@falcon/shared/ai/types";

const VERSION = 1;
const PREFIX = "lms_ai_chat_history/";
const VERSION_KEY = "lms_ai_chat_history/__version__";
const MAX_MESSAGES_PER_ASSIGNMENT = 40;

interface StoredChat {
  v: number;
  messages: ChatMessage[];
  /** 最後に書き込んだ時刻 (pruneOldest 用)。 */
  updatedAt: number;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

function entryKey(assignmentId: string): string {
  return `${PREFIX}${assignmentId}`;
}

/** 起動時に呼ぶ。バージョン不一致なら旧データを破棄する。 */
export function initChatStore(): void {
  const ls = safeStorage();
  if (!ls) {
    return;
  }

  const stored = ls.getItem(VERSION_KEY);
  if (stored === String(VERSION)) {
    return;
  }

  // バージョン不一致 (または未設定) → 旧データを掃除
  const obsolete: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k?.startsWith(PREFIX) && k !== VERSION_KEY) {
      obsolete.push(k);
    }
  }
  for (const k of obsolete) {
    ls.removeItem(k);
  }

  try {
    ls.setItem(VERSION_KEY, String(VERSION));
  } catch {
    // ignore
  }
}

export function loadHistory(assignmentId: string): ChatMessage[] {
  const ls = safeStorage();
  if (!ls) {
    return [];
  }
  const raw = ls.getItem(entryKey(assignmentId));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredChat>;
    if (parsed.v !== VERSION) {
      return [];
    }
    if (!Array.isArray(parsed.messages)) {
      return [];
    }
    // 軽い形チェック
    return parsed.messages.filter(
      (m): m is ChatMessage =>
        m !== null &&
        m !== undefined &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    );
  } catch {
    ls.removeItem(entryKey(assignmentId));
    return [];
  }
}

export function saveHistory(assignmentId: string, messages: ChatMessage[]): void {
  const ls = safeStorage();
  if (!ls) {
    return;
  }

  // 上限を超えていたら古い順に間引く
  const trimmed =
    messages.length > MAX_MESSAGES_PER_ASSIGNMENT
      ? messages.slice(messages.length - MAX_MESSAGES_PER_ASSIGNMENT)
      : messages;

  const payload: StoredChat = {
    v: VERSION,
    messages: trimmed,
    updatedAt: Date.now(),
  };
  const serialized = JSON.stringify(payload);

  try {
    ls.setItem(entryKey(assignmentId), serialized);
  } catch (e) {
    if (isQuotaError(e)) {
      pruneOldest(ls, assignmentId);
      try {
        ls.setItem(entryKey(assignmentId), serialized);
      } catch {
        // 諦める。ユーザの操作を妨げないため例外は飲み込む。
      }
    }
  }
}

export function clearHistory(assignmentId: string): void {
  const ls = safeStorage();
  if (!ls) {
    return;
  }
  ls.removeItem(entryKey(assignmentId));
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) {
    return false;
  }
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(e.message)
  );
}

function pruneOldest(ls: Storage, currentAssignmentId: string): void {
  type Item = { key: string; ts: number };
  const items: Item[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k?.startsWith(PREFIX) || k === VERSION_KEY) {
      continue;
    }
    if (k === entryKey(currentAssignmentId)) {
      continue;
    }
    const raw = ls.getItem(k);
    let ts = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<StoredChat>;
        ts = parsed.updatedAt ?? 0;
      } catch {
        ts = 0;
      }
    }
    items.push({ key: k, ts });
  }
  items.sort((a, b) => a.ts - b.ts);
  const removeCount = Math.max(1, Math.ceil(items.length / 4));
  for (let i = 0; i < removeCount && i < items.length; i++) {
    ls.removeItem(items[i].key);
  }
}
