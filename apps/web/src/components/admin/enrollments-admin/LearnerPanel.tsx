/**
 * 受講状況画面の左ペイン ―「受講生を選ぶ」。
 *
 * 行クリックで単独選択 (右ペインがその 1 名の受講状況になる)、 チェックボックスで複数選択
 * (右ペインが複数名ぶんの一覧になる) と、 2 つの選び方を用意している。
 *
 * バッジの「n/m 件」は **自分で開始した数 / 公開教材の数**。 Phase 3b で割当が無くなり、
 * 「割り当てられた数」ではなくなった。
 */

import { useMemo } from "react";

import { Search, Users } from "@/lib/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import type { AdminProfileRow } from "@/lib/admin-users-api";
import type { EnrollmentSummaryRow } from "@stella/shared/cms/types";
import { RoleBadge, toneFromId } from "../users-admin/shared";
import { type LearnerFilter, matchesProfile } from "./shared";

interface Props {
  students: AdminProfileRow[];
  staff: AdminProfileRow[];
  filter: LearnerFilter;
  onChangeFilter: (filter: LearnerFilter) => void;
  query: string;
  onChangeQuery: (query: string) => void;
  selectedIds: Set<string>;
  /** 行クリック。 その 1 名だけを選択し直す。 */
  onSelectOnly: (userId: string) => void;
  /** チェックボックス。 複数選択に足す / 外す。 */
  onToggle: (userId: string) => void;
  /** 表示中の受講者をまとめて選択 / 解除する。 */
  onSetVisibleSelected: (userIds: string[], selected: boolean) => void;
  /** 受講者 id → 割当件数 / 期限超過件数 (サーバ集計)。 */
  summaries: Map<string, EnrollmentSummaryRow>;
  stageCount: number;
  loading: boolean;
}

export function LearnerPanel({
  students,
  staff,
  filter,
  onChangeFilter,
  query,
  onChangeQuery,
  selectedIds,
  onSelectOnly,
  onToggle,
  onSetVisibleSelected,
  summaries,
  stageCount,
  loading,
}: Props) {
  const visible = useMemo(() => {
    const source = filter === "student" ? students : staff;
    return source.filter((p) => matchesProfile(p, query));
  }, [filter, students, staff, query]);

  const visibleIds = visible.map((p) => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return (
    <Card className="flex flex-col self-start max-h-[calc(100vh-13rem)] lg:sticky lg:top-4">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-brand" />
          <h2 className="text-[13px] font-semibold tracking-tight">受講生を選ぶ</h2>
          <span className="ml-auto text-[11.5px] text-ink-3">
            {selectedIds.size > 0 ? `${selectedIds.size} 名選択中` : `${visible.length} 名`}
          </span>
        </div>

        <div className="relative mt-2.5">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4"
          />
          <Input
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="名前 / メールで検索"
            aria-label="受講生を検索"
            className="h-9 pl-8 text-[13px]"
          />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <Chip active={filter === "student"} onClick={() => onChangeFilter("student")}>
            受講者 {students.length}
          </Chip>
          <Chip active={filter === "staff"} onClick={() => onChangeFilter("staff")}>
            スタッフ {staff.length}
          </Chip>
        </div>
      </div>

      {visibleIds.length > 0 ? (
        <div className="flex items-center gap-2 border-b border-border bg-sunken px-4 py-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => onSetVisibleSelected(visibleIds, !allVisibleSelected)}
            />
            表示中をすべて選択
          </label>
          {selectedIds.size > 0 ? (
            <button
              type="button"
              onClick={() => onSetVisibleSelected([...selectedIds], false)}
              className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 hover:text-foreground"
            >
              選択を解除
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && visible.length === 0 ? (
          <SkeletonRows rows={5} className="p-4" />
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12.5px] text-ink-3">
            {query.trim()
              ? "検索条件に一致する受講生がいません。"
              : filter === "student"
                ? "受講者がいません。 「ユーザー管理」 から招待してください。"
                : "講師 / 管理者アカウントがありません。"}
          </p>
        ) : (
          <ul>
            {visible.map((p) => {
              const summary = summaries.get(p.id);
              const assigned = summary?.total ?? 0;
              const overdue = summary?.overdue ?? 0;
              const selected = selectedIds.has(p.id);
              return (
                <li
                  key={p.id}
                  className={
                    selected
                      ? "flex items-center gap-2 border-l-2 border-brand bg-brand-soft/60 px-3 py-2"
                      : "flex items-center gap-2 border-l-2 border-transparent px-3 py-2 hover:bg-sunken"
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(p.id)}
                    aria-label={`${p.display_name} を選択`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectOnly(p.id)}
                    aria-pressed={selected}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <Avatar size="sm">
                      <AvatarFallback tone={toneFromId(p.id)}>
                        {(p.initials ?? p.display_name.slice(0, 1)).slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {p.display_name}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-3">
                        {p.email ?? "—"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {p.role !== "student" ? <RoleBadge role={p.role} /> : null}
                      <span className="text-[11.5px] text-ink-3">
                        {assigned}/{stageCount} 件
                      </span>
                      {overdue > 0 ? <Badge variant="warning">期限超過 {overdue}</Badge> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
