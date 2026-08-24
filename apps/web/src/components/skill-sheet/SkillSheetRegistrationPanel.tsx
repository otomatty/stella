import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Loader2, Upload } from "@/lib/icons";
import { toast } from "sonner";
import type { ProfileRole } from "@falcon/shared/cms/types";
import type { SkillSheetV1, SkillSheetV1Sections } from "@falcon/shared/skill-sheet/types";
import { emptySkillSheetSections } from "@falcon/shared/skill-sheet/types";
import type { Role } from "@/data/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import { fetchSkillSheet, parseSkillSheet, saveSkillSheet } from "@/lib/skill-sheet-api";
import {
  initialSkillSheetRegistrationState,
  reduceSkillSheetRegistration,
} from "@/lib/skill-sheet-registration-flow";
import {
  canReplaceSkillSheetUpload,
  resolveSkillSheetUiMode,
  skillSheetFormSectionKeys,
  skillSheetParseFailureMessage,
  skillSheetSaveSuccessBanner,
} from "@/lib/skill-sheet-ui";

const SECTION_LABELS: Record<string, string> = {
  basic: "基本情報",
  skills: "スキル",
  projects: "プロジェクト",
  certifications: "資格",
  self_pr: "自己 PR",
};

function parseJsonArray(value: string): unknown[] | null {
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function SkillSheetFormEditor({
  sheet,
  readOnly,
  onChange,
}: {
  sheet: SkillSheetV1;
  readOnly: boolean;
  onChange: (sheet: SkillSheetV1) => void;
}) {
  const { sections } = sheet;

  const updateSections = (patch: Partial<SkillSheetV1Sections>) => {
    onChange({ sections: { ...sections, ...patch } });
  };

  const basicYears =
    typeof sections.basic.years_total === "number" ? sections.basic.years_total : "";
  const basicRole =
    typeof sections.basic.current_role === "string" ? sections.basic.current_role : "";

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold">{SECTION_LABELS.basic}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1 text-[12px] text-ink-3">
            <span>経験年数</span>
            <Input
              type="number"
              min={0}
              readOnly={readOnly}
              value={basicYears}
              onChange={(e) =>
                updateSections({
                  basic: {
                    ...sections.basic,
                    years_total: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                })
              }
              className="h-8 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1 text-[12px] text-ink-3">
            <span>現職・役割</span>
            <Input
              readOnly={readOnly}
              value={basicRole}
              onChange={(e) =>
                updateSections({
                  basic: { ...sections.basic, current_role: e.target.value },
                })
              }
              className="h-8 text-[13px]"
            />
          </div>
        </div>
      </section>

      <JsonArraySection
        label={SECTION_LABELS.skills ?? "スキル"}
        value={sections.skills}
        readOnly={readOnly}
        onChange={(skills) => updateSections({ skills })}
      />

      <JsonArraySection
        label={SECTION_LABELS.projects ?? "プロジェクト"}
        value={sections.projects}
        readOnly={readOnly}
        onChange={(projects) => updateSections({ projects })}
      />

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold">{SECTION_LABELS.certifications}</h3>
        {readOnly ? (
          <ul className="text-[13px] list-disc pl-5">
            {sections.certifications.length === 0 ? (
              <li className="text-ink-3 list-none">—</li>
            ) : (
              sections.certifications.map((c) => <li key={String(c)}>{String(c)}</li>)
            )}
          </ul>
        ) : (
          <textarea
            className="w-full min-h-20 rounded-sm border border-border bg-surface p-2 text-[13px]"
            value={sections.certifications.map(String).join("\n")}
            onChange={(e) =>
              updateSections({
                certifications: e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
            placeholder="1 行に 1 資格"
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold">{SECTION_LABELS.self_pr}</h3>
        {readOnly ? (
          <p className="text-[13px] whitespace-pre-wrap">{sections.self_pr || "—"}</p>
        ) : (
          <textarea
            className="w-full min-h-28 rounded-sm border border-border bg-surface p-2 text-[13px]"
            value={sections.self_pr}
            onChange={(e) => updateSections({ self_pr: e.target.value })}
            placeholder="自己 PR を入力"
          />
        )}
      </section>
    </div>
  );
}

function JsonArraySection({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: unknown[];
  readOnly: boolean;
  onChange: (next: unknown[]) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setInvalid(false);
  }, [value]);

  if (readOnly) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold">{label}</h3>
        <pre className="text-[12px] whitespace-pre-wrap rounded-sm border border-border bg-sunken/40 p-2 overflow-x-auto">
          {value.length === 0 ? "—" : JSON.stringify(value, null, 2)}
        </pre>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-semibold">{label}</h3>
      <textarea
        className="w-full min-h-28 rounded-sm border border-border bg-surface p-2 font-mono text-[12px]"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = parseJsonArray(e.target.value);
          if (parsed === null) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onChange(parsed);
        }}
      />
      {invalid ? (
        <p className="text-[12px] text-destructive">JSON 配列の形式が正しくありません。</p>
      ) : null}
    </section>
  );
}

export function SkillSheetRegistrationPanel({
  backendEnabled,
  profileRole,
  shellRole,
  currentUserId,
  targetProfileId,
  learnerDisplayName,
}: {
  backendEnabled: boolean;
  profileRole: ProfileRole | undefined;
  shellRole: Role;
  currentUserId: string;
  targetProfileId: string;
  learnerDisplayName?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const uiMode = resolveSkillSheetUiMode({
    profileRole,
    shellRole,
    targetProfileId,
    currentUserId,
  });
  const readOnly = uiMode === "view-only";

  const [state, dispatch] = useReducer(
    reduceSkillSheetRegistration,
    { profileRole, hasSavedSheet: false },
    (input) => initialSkillSheetRegistrationState(input),
  );

  const reloadSaved = useCallback(async () => {
    if (!backendEnabled || !targetProfileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const saved = await fetchSkillSheet(targetProfileId);
      dispatch({
        type: "LOAD_SAVED",
        sheet: { sections: saved.sections },
        id: saved.id,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!/404|見つかりません/i.test(message)) {
        setLoadError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [backendEnabled, targetProfileId]);

  useEffect(() => {
    void reloadSaved();
  }, [reloadSaved]);

  const handleFile = async (file: File) => {
    dispatch({ type: "UPLOAD_START" });
    try {
      const draft = await parseSkillSheet(file);
      dispatch({
        type: "PARSE_SUCCESS",
        draft: { sections: draft.sections },
        r2Key: draft.r2Key,
      });
    } catch (e) {
      dispatch({
        type: "PARSE_FAILURE",
        message: skillSheetParseFailureMessage(e) ?? "解析に失敗しました。手入力で登録できます。",
      });
    }
  };

  const handleSave = async () => {
    if (!state.draft || !state.canSave) return;
    setSaving(true);
    try {
      const result = await saveSkillSheet(targetProfileId, state.draft, state.r2Key ?? undefined);
      dispatch({ type: "SAVE_SUCCESS", id: result.id });
      toast.success("スキルシートを保存しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!backendEnabled) {
    return (
      <Card className="p-12 text-center text-sm text-ink-3">
        デモモードではスキルシートを登録できません。
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <SkeletonRows rows={4} />
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="p-12 text-center text-sm text-destructive">
        スキルシートの取得に失敗しました: {loadError}
      </Card>
    );
  }

  const sectionKeys = skillSheetFormSectionKeys();
  const showForm = state.phase === "draft" || state.phase === "view" || state.phase === "saved";
  const formSheet: SkillSheetV1 = state.draft ?? { sections: emptySkillSheetSections() };
  const banner = state.showGenerationBanner ? skillSheetSaveSuccessBanner() : null;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-2 justify-between">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">スキルシート</h2>
          {learnerDisplayName ? (
            <p className="text-[12px] text-ink-3 mt-0.5">{learnerDisplayName}</p>
          ) : null}
          {uiMode === "proxy-register" ? (
            <p className="text-[12px] text-ink-3 mt-0.5">受講者に代わって登録・更新します</p>
          ) : null}
          {readOnly ? (
            <p className="text-[12px] text-ink-3 mt-0.5">閲覧のみ（アップロード不可）</p>
          ) : null}
        </div>
        {state.canUpload && canReplaceSkillSheetUpload(profileRole) ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={state.phase === "parsing"}
              onClick={() => {
                if (state.phase === "saved" || state.phase === "view") {
                  dispatch({ type: "REUPLOAD" });
                }
                fileInputRef.current?.click();
              }}
            >
              {state.phase === "parsing" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {state.phase === "idle" || state.phase === "parsing"
                ? "PDF / Excel をアップロード"
                : "別ファイルで置き換え"}
            </Button>
          </div>
        ) : null}
      </div>

      {state.phase === "parsing" ? (
        <p className="text-[13px] text-ink-3 inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          スキルシートを解析しています…
        </p>
      ) : null}

      {state.phase === "idle" && !readOnly ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-3">
            PDF または Excel (.xlsx) をアップロードすると AI が共通フォーマットへ解析します。
          </p>
          {state.canManualEntry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "START_MANUAL_ENTRY" })}
            >
              手入力で登録する
            </Button>
          ) : null}
        </div>
      ) : null}

      {state.parseError ? (
        <p className="text-[13px] text-warning rounded-sm border border-warning/30 bg-warning/5 p-3">
          {state.parseError}
        </p>
      ) : null}

      {banner ? (
        <p className="text-[13px] text-info rounded-sm border border-info/30 bg-info/5 p-3">
          {banner}
        </p>
      ) : null}

      {state.phase === "saved" && !state.draft ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-2">スキルシートは保存済みです。</p>
          <Button variant="outline" size="sm" onClick={() => void reloadSaved()}>
            内容を表示
          </Button>
        </div>
      ) : null}

      {showForm && state.draft ? (
        <>
          <SkillSheetFormEditor
            sheet={formSheet}
            readOnly={readOnly || state.phase === "saved"}
            onChange={(sheet) => dispatch({ type: "EDIT_FIELD", sheet })}
          />
          {state.canSave && state.phase === "draft" ? (
            <div className="flex justify-end border-t border-border pt-4">
              <Button variant="accent" disabled={saving} onClick={() => void handleSave()}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                保存する
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Section keys contract — keeps form aligned with #203 v1 schema */}
      <span className="sr-only">{sectionKeys.join(",")}</span>
    </Card>
  );
}
