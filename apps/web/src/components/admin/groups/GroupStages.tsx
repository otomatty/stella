import { isIslandWithoutRequirements } from "@stella/shared/skill-map/islands";
import type { IntegrationStageInput } from "@stella/shared/integrations/types";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  extraStageAncestors,
  toGroupStageDraft,
  toGroupStageInput,
  type GroupStage,
  type GroupStageDraft,
} from "@/lib/admin-group-stages";
import type { GroupRequest } from "@/lib/admin-groups-api";
import { ApiClientError } from "@/lib/api-client";
import { getStaffSkillMap, type StaffSkillMapStageNode } from "@/lib/skill-map-api";
import { fetchStaffStageTasks } from "@/lib/staff-stage-api";
import { GroupTime } from "./group-display";

const STAGE_ERRORS: ReadonlyMap<string, string> = new Map([
  ["invalid_stage", "期限・案内文・前提の免除の入力を確認してください。"],
  ["duplicate_slug", "同じステージが重複しています。"],
  ["not_granted", "このステージは Extra ステージではありません。"],
  ["parent_not_included", "この親ステージを追加してください。"],
]);

function stageErrors(error: unknown) {
  const messages = new Map<string, string[]>();
  if (!(error instanceof ApiClientError) || error.status !== 400) return messages;
  const data = error.data;
  if (!data || typeof data !== "object" || !("errors" in data) || !Array.isArray(data.errors))
    return messages;
  for (const item of data.errors) {
    if (typeof item?.slug !== "string" || typeof item.code !== "string") continue;
    const message = STAGE_ERRORS.get(item.code) ?? "ステージの設定を確認してください。";
    messages.set(item.slug, [...(messages.get(item.slug) ?? []), message]);
  }
  return messages;
}

async function loadCatalog(signal: AbortSignal) {
  const { stages } = await getStaffSkillMap(signal);
  const catalog = new Map(stages.map((stage) => [stage.id, stage]));
  await Promise.all(
    stages.map(async (stage) => {
      // 表示条件のないコースでは、前提がないステージの親は配置にだけ使われる。
      if (
        !isIslandWithoutRequirements(stage.category) ||
        !extraStageAncestors(stage, catalog).length
      )
        return;
      const { prerequisites } = await fetchStaffStageTasks(stage.id, signal);
      if (prerequisites.length === 0) catalog.set(stage.id, { ...stage, parent_id: undefined });
    }),
  );
  return catalog;
}

export function GroupStages({
  stages,
  editable,
  request,
  onSaved,
}: {
  stages: GroupStage[];
  editable: boolean;
  request: GroupRequest;
  onSaved: (stages: GroupStage[]) => void;
}) {
  const selectId = useId();
  const [draft, setDraft] = useState(() => stages.map(toGroupStageDraft));
  const [catalog, setCatalog] = useState<Map<string, StaffSkillMapStageNode> | null>(null);
  const [selected, setSelected] = useState("");
  const [catalogError, setCatalogError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState(new Map<string, string[]>());
  const [removeError, setRemoveError] = useState<{ slug: string; message: string } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt は再読み込みのトリガー。
  useEffect(() => {
    if (!editable) return;
    const controller = new AbortController();
    void loadCatalog(controller.signal)
      .then(setCatalog)
      .catch(() => {
        if (!controller.signal.aborted) setCatalogError(true);
      });
    return () => controller.abort();
  }, [editable, attempt]);

  const selectedIds = new Set(draft.map((stage) => stage.id));
  const candidates = catalog
    ? [...catalog.values()]
        .filter(
          (stage) =>
            stage.audience === "granted" && stage.slug && stage.title && !selectedIds.has(stage.id),
        )
        .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "ja"))
    : [];
  const unmatchedErrors = [...rowErrors].filter(
    ([slug]) => !draft.some((row) => row.slug === slug),
  );
  const changed =
    draft.length !== stages.length ||
    draft.some((row) => {
      const saved = stages.find((stage) => stage.id === row.id);
      return (
        !saved ||
        row.message !== saved.message ||
        row.exempt !== saved.exempt ||
        row.date !== toGroupStageDraft(saved).date
      );
    });

  function addStage() {
    const stage = catalog?.get(selected);
    if (!catalog || !stage || busy) return;
    const additions = [...extraStageAncestors(stage, catalog), stage].flatMap((node) => {
      if (selectedIds.has(node.id) || !node.slug || !node.title) return [];
      return [
        toGroupStageDraft({
          id: node.id,
          slug: node.slug,
          title: node.title,
          dueAt: null,
          message: null,
          exempt: false,
        }),
      ];
    });
    setDraft([...draft, ...additions]);
    setRowErrors(new Map());
    setRemoveError(null);
    setSelected("");
  }

  function removeStage(row: GroupStageDraft) {
    if (!catalog || busy) return;
    const child = draft.find((candidate) => {
      const node = catalog.get(candidate.id);
      return node && extraStageAncestors(node, catalog).some((parent) => parent.id === row.id);
    });
    if (child) {
      setRemoveError({
        slug: row.slug,
        message: `「${child.title}」にこの親ステージが必要です。先に子ステージを外してください。`,
      });
      return;
    }
    setRemoveError(null);
    setRowErrors(new Map());
    setDraft(draft.filter((item) => item.id !== row.id));
  }

  function editStage(
    id: string,
    changes: Partial<Pick<GroupStageDraft, "date" | "message" | "exempt">>,
  ) {
    setDraft(draft.map((row) => (row.id === id ? { ...row, ...changes } : row)));
    const slug = draft.find((row) => row.id === id)?.slug;
    if (slug && rowErrors.has(slug)) {
      const remaining = new Map(rowErrors);
      remaining.delete(slug);
      setRowErrors(remaining);
    }
  }

  async function saveStages() {
    if (busy || !changed) return;
    setBusy(true);
    setSaveError(null);
    setRowErrors(new Map());
    try {
      const saved = await request<{ stages: Required<IntegrationStageInput>[] }>("/stages", {
        method: "PUT",
        body: { stages: draft.map(toGroupStageInput) },
      });
      const bySlug = new Map(draft.map((row) => [row.slug, row]));
      const rows = saved.stages.flatMap((setting) => {
        const row = bySlug.get(setting.slug);
        return row
          ? [
              {
                id: row.id,
                slug: row.slug,
                title: row.title,
                dueAt: setting.due_at,
                message: setting.message,
                exempt: setting.exempt,
              },
            ]
          : [];
      });
      setDraft(rows.map(toGroupStageDraft));
      setRemoveError(null);
      onSaved(rows);
      toast.success("ステージ設定を保存しました");
    } catch (error) {
      const messages = stageErrors(error);
      setRowErrors(messages);
      setSaveError(
        messages.size
          ? "ステージ設定を保存できませんでした。各行の内容を確認してください。"
          : error instanceof ApiClientError && error.status === 400
            ? "ステージの設定を確認してください。"
            : error instanceof Error
              ? error.message
              : "ステージ設定を保存できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {editable &&
          (catalogError ? (
            <div className="space-y-3">
              <Notice role="alert">ステージの候補を取得できませんでした。</Notice>
              <Button
                type="button"
                className="min-h-11"
                onClick={() => {
                  setCatalogError(false);
                  setAttempt(attempt + 1);
                }}
              >
                再読み込み
              </Button>
            </div>
          ) : catalog === null ? (
            <p role="status" className="text-sm text-ink-2">
              ステージの候補を読み込んでいます…
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full min-w-0 sm:max-w-sm">
                  <Label htmlFor={selectId}>追加する Extra ステージ</Label>
                  <NativeSelect
                    id={selectId}
                    className="min-h-11 w-full"
                    value={selected}
                    disabled={busy || candidates.length === 0}
                    onChange={(event) => setSelected(event.target.value)}
                  >
                    <option value="">
                      {candidates.length ? "ステージを選ぶ" : "追加できるステージはありません"}
                    </option>
                    {candidates.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.title}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={!selected || busy}
                  onClick={addStage}
                >
                  追加
                </Button>
              </div>
              <p className="text-sm text-ink-2">必要な Extra の親ステージも自動で追加します。</p>
            </div>
          ))}
        {saveError && <Notice role="alert">{saveError}</Notice>}
        {draft.length === 0 && unmatchedErrors.length === 0 ? (
          <p className="text-sm text-ink-2">ステージは設定されていません。</p>
        ) : (
          <Table aria-label="グループのステージ設定">
            <TableHeader>
              <TableRow>
                {["ステージ", "期限（日本時間）", "案内文", "前提の免除"].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
                {editable && <TableHead>操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.map((row) => {
                const messages = rowErrors.get(row.slug);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-56 break-all font-medium">
                      {row.title}
                      {messages && (
                        <Notice role="alert" className="mt-2">
                          {messages.join(" ")}
                        </Notice>
                      )}
                      {removeError?.slug === row.slug && (
                        <Notice role="status" tone="info" className="mt-2">
                          {removeError.message}
                        </Notice>
                      )}
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <Input
                          type="date"
                          className="min-h-11 min-w-36"
                          aria-label={`${row.title}の期限（日本時間）`}
                          value={row.date}
                          disabled={busy}
                          onChange={(event) => editStage(row.id, { date: event.target.value })}
                        />
                      ) : row.dueAt ? (
                        <span className="whitespace-nowrap">
                          <GroupTime value={row.dueAt} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-pre-wrap break-all">
                      {editable ? (
                        <Textarea
                          className="min-w-44"
                          aria-label={`${row.title}の案内文（500文字まで）`}
                          value={row.message ?? ""}
                          maxLength={500}
                          disabled={busy}
                          onChange={(event) =>
                            editStage(row.id, { message: event.target.value || null })
                          }
                        />
                      ) : (
                        (row.message ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {editable ? (
                        <label className="inline-flex min-h-11 items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-5 accent-primary"
                            aria-label={`${row.title}の前提を免除する`}
                            checked={row.exempt}
                            disabled={busy}
                            onChange={(event) =>
                              editStage(row.id, { exempt: event.target.checked })
                            }
                          />
                          免除する
                        </label>
                      ) : row.exempt ? (
                        "あり"
                      ) : (
                        "なし"
                      )}
                    </TableCell>
                    {editable && (
                      <TableCell>
                        <Button
                          type="button"
                          className="min-h-11"
                          variant="outline"
                          aria-label={`${row.title}を外す`}
                          disabled={busy || !catalog}
                          onClick={() => removeStage(row)}
                        >
                          外す
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {unmatchedErrors.map(([slug, messages]) => (
                <TableRow key={slug}>
                  <TableCell className="max-w-56 break-all font-medium">
                    {candidates.find((stage) => stage.slug === slug)?.title ?? slug}
                  </TableCell>
                  <TableCell colSpan={4}>
                    <Notice role="alert">{messages.join(" ")}</Notice>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {editable && (
          <Button
            type="button"
            className="min-h-11"
            variant="primary"
            disabled={busy || !changed || !catalog}
            onClick={() => void saveStages()}
          >
            {busy ? "保存しています…" : "保存"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
