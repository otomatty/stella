/**
 * 課題 (assignment) を作成 / 編集するフルスクリーン Dialog。
 *
 * Tabs (各タブの UI は assignment-editor/ 配下のサブコンポーネント):
 *  - メタ情報: id (新規時のみ編集可) / title / stage / chapter / language / testKind / entryFile / entryPoints / demoCall / description
 *  - スターターファイル: 既存 `FileTabs` + `Editor` をそのまま再利用。 admin 用にファイル追加/削除/リネーム/readonly トグルを追加
 *  - テスト: testKind 別の構造化フォーム + 「Raw JSON 編集」 フォールバック
 *  - 静的解析: lintPreset + AST required/forbidden の JSON 編集 (JS のみ)
 *  - プレビュー: `runGrading` を叩いて結果テーブルを表示
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "@/lib/icons";
import type {
  AssignmentFile,
  Assignment,
  ASTRequirement,
  ESLintRuleConfig,
  LintPreset,
} from "@falcon/shared/types";
import { getStaticAnalysisSettings } from "@falcon/shared/assignment-helpers";
import { analyzeAst } from "@falcon/shared/grading";
import { runGrading } from "@falcon/code-runner/runners";
import {
  getAssignmentRow,
  upsertAssignment,
} from "@/lib/cms-api";
import { getLinter } from "@/practice/lib/linters";

import {
  fromRow,
  newDraft,
  parseJsonStrict,
  type Draft,
  type PreviewResult,
} from "./assignment-editor/draft";
import { MetaForm } from "./assignment-editor/MetaForm";
import { FilesForm } from "./assignment-editor/FilesForm";
import { TestsForm } from "./assignment-editor/TestsForm";
import { StaticAnalysisForm } from "./assignment-editor/StaticAnalysisForm";
import { PreviewPanel } from "./assignment-editor/PreviewPanel";

interface Props {
  tenantId: string;
  /** null = 新規作成 */
  assignmentId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function AssignmentEditor({ tenantId, assignmentId, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [loading, setLoading] = useState(assignmentId !== null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setDraft(newDraft());
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await getAssignmentRow(assignmentId);
        if (!cancelled && row) setDraft(fromRow(row));
      } catch (err) {
        toast.error(`課題読み込み失敗: ${err instanceof Error ? err.message : "unknown"}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const updateFile = (path: string, patch: Partial<AssignmentFile>) => {
    setDraft((d) => ({
      ...d,
      starterFiles: d.starterFiles.map((f) => (f.path === path ? { ...f, ...patch } : f)),
    }));
  };

  const renameFile = (oldPath: string, newPath: string) => {
    if (!newPath || newPath === oldPath) return;
    if (draft.starterFiles.some((f) => f.path === newPath)) {
      toast.error("同名のファイルが既に存在します");
      return;
    }
    setDraft((d) => ({
      ...d,
      starterFiles: d.starterFiles.map((f) => (f.path === oldPath ? { ...f, path: newPath } : f)),
      entryFile: d.entryFile === oldPath ? newPath : d.entryFile,
      activeFile: d.activeFile === oldPath ? newPath : d.activeFile,
    }));
  };

  const addFile = () => {
    const base = draft.language === "sql" ? "extra.sql" : "extra.js";
    let name = base;
    let i = 1;
    while (draft.starterFiles.some((f) => f.path === name)) {
      name = `${base.replace(/\./, `-${i}.`)}`;
      i += 1;
    }
    setDraft((d) => ({
      ...d,
      starterFiles: [...d.starterFiles, { path: name, content: "" }],
      activeFile: name,
    }));
  };

  const removeFile = (path: string) => {
    if (draft.starterFiles.length <= 1) {
      toast.error("最後の 1 ファイルは削除できません");
      return;
    }
    setDraft((d) => {
      const remaining = d.starterFiles.filter((f) => f.path !== path);
      return {
        ...d,
        starterFiles: remaining,
        activeFile: d.activeFile === path ? remaining[0].path : d.activeFile,
        entryFile: d.entryFile === path ? remaining[0].path : d.entryFile,
      };
    });
  };

  const buildAssignment = (): Assignment => {
    const astRequired = parseJsonStrict<unknown[]>(draft.astRequiredJson, "AST required", []);
    const astForbidden = parseJsonStrict<unknown[]>(draft.astForbiddenJson, "AST forbidden", []);
    const eslintRules = parseJsonStrict<Record<string, ESLintRuleConfig>>(
      draft.eslintRulesJson,
      "ESLint rules 上書き",
      {},
    );
    const ast = {
      required: astRequired as ASTRequirement["required"],
      forbidden: astForbidden as ASTRequirement["forbidden"],
    } satisfies ASTRequirement;
    const entryPoints = draft.entryPoints
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const base = {
      id: draft.id,
      stage: draft.stage,
      chapterId: draft.chapterId,
      sequence: 0,
      title: draft.title,
      newConcept: "",
      estimatedMinutes: 5,
      difficulty: 1 as const,
      description: draft.description,
      language: draft.language,
      starterFiles: draft.starterFiles,
      entryFile: draft.entryFile,
      ...(draft.sqlSeed ? { sqlSeed: draft.sqlSeed } : {}),
      ...(entryPoints.length ? { entryPoints } : {}),
      ...(draft.demoCall ? { demoCall: draft.demoCall } : {}),
      tests: draft.tests,
      ...(draft.lintPreset ? { lintPreset: draft.lintPreset } : {}),
      staticAnalysis: {
        eslint: { rules: eslintRules },
        ast,
      },
    };
    if (draft.testKind === "mutation" || draft.testKind === "eslint-config") {
      throw new Error("mutation / eslint-config 課題は UI 編集対象外です");
    }
    return { ...base, testKind: draft.testKind } as Assignment;
  };

  const runPreview = async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const assignment = buildAssignment();
      const files: Record<string, string> = {};
      for (const f of assignment.starterFiles) files[f.path] = f.content;

      const settings = getStaticAnalysisSettings(assignment);
      let lint: ReturnType<ReturnType<typeof getLinter>> = [];
      let ast = { required: [], forbidden: [] } as Awaited<ReturnType<typeof analyzeAst>>;
      if (assignment.language === "javascript") {
        const linter = getLinter("javascript");
        lint = linter(files[assignment.entryFile ?? assignment.starterFiles[0].path] ?? "", settings.eslintRules, {
          ignoredUnusedNames: settings.ignoredUnusedNames,
        });
        ast = analyzeAst("javascript", files[assignment.entryFile ?? assignment.starterFiles[0].path] ?? "", settings.ast);
      }

      const { response, evaluation } = await runGrading({
        files,
        assignment,
        lint,
        ast,
      });
      setPreview({ evaluation, results: response.results });
    } catch (err) {
      setPreview({
        evaluation: {
          cleared: false,
          checks: { lintPassed: false, astPassed: false, testsPassed: false },
        },
        results: [],
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const astRequired = parseJsonStrict<unknown[]>(draft.astRequiredJson, "AST required", []);
      const astForbidden = parseJsonStrict<unknown[]>(draft.astForbiddenJson, "AST forbidden", []);
      const eslintRules = parseJsonStrict<Record<string, ESLintRuleConfig>>(
        draft.eslintRulesJson,
        "ESLint rules 上書き",
        {},
      );
      const entryPoints = draft.entryPoints
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await upsertAssignment({
        id: draft.id,
        tenant_id: tenantId,
        stage: draft.stage,
        chapter_id: draft.chapterId,
        title: draft.title,
        description: draft.description,
        language: draft.language,
        test_kind: draft.testKind,
        starter_files: draft.starterFiles,
        entry_file: draft.entryFile || null,
        entry_points: entryPoints.length ? entryPoints : null,
        tests: draft.tests,
        sql_seed: draft.sqlSeed || null,
        lint_preset: (draft.lintPreset || null) as LintPreset | null,
        static_analysis: {
          eslint: { rules: eslintRules },
          ast: {
            required: astRequired as ASTRequirement["required"],
            forbidden: astForbidden as ASTRequirement["forbidden"],
          },
        },
        mutation: null,
        demo_call: draft.demoCall || null,
      });
      toast.success("課題を保存しました");
      await onSaved();
    } catch (err) {
      toast.error(`保存失敗: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  const activeFile = useMemo(
    () => draft.starterFiles.find((f) => f.path === draft.activeFile) ?? draft.starterFiles[0],
    [draft.activeFile, draft.starterFiles],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] w-[95vw] max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{assignmentId ? `課題編集: ${draft.id}` : "新規課題"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-ink-3 text-sm">読み込み中…</div>
        ) : (
          <Tabs defaultValue="meta" className="flex-1 flex flex-col overflow-hidden">
            <TabsList>
              <TabsTrigger value="meta">メタ情報</TabsTrigger>
              <TabsTrigger value="files">スターターファイル</TabsTrigger>
              <TabsTrigger value="tests">テスト</TabsTrigger>
              {draft.language === "javascript" ? (
                <TabsTrigger value="static">静的解析</TabsTrigger>
              ) : null}
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-1">
              <TabsContent value="meta">
                <MetaForm draft={draft} update={update} disableId={Boolean(assignmentId)} />
              </TabsContent>

              <TabsContent value="files">
                <FilesForm
                  files={draft.starterFiles}
                  activeFile={activeFile?.path ?? ""}
                  entryFile={draft.entryFile}
                  language={draft.language}
                  eslintRulesJson={draft.eslintRulesJson}
                  entryPoints={draft.entryPoints}
                  onSelect={(path) => update({ activeFile: path })}
                  onEditContent={(content) => updateFile(activeFile.path, { content })}
                  onAdd={addFile}
                  onRemove={removeFile}
                  onRename={renameFile}
                  onToggleReadonly={() => updateFile(activeFile.path, { readonly: !activeFile.readonly })}
                  onSetEntry={(path) => update({ entryFile: path })}
                />
                {draft.language === "sql" ? (
                  <div className="mt-4">
                    <Label htmlFor="ae-sqlseed">SQL Seed (採点前に実行)</Label>
                    <Textarea
                      id="ae-sqlseed"
                      rows={6}
                      value={draft.sqlSeed}
                      onChange={(e) => update({ sqlSeed: e.target.value })}
                      className="font-mono text-[12.5px]"
                    />
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="tests">
                <TestsForm draft={draft} update={update} />
              </TabsContent>

              {draft.language === "javascript" ? (
                <TabsContent value="static">
                  <StaticAnalysisForm draft={draft} update={update} />
                </TabsContent>
              ) : null}

              <TabsContent value="preview">
                <PreviewPanel
                  previewing={previewing}
                  preview={preview}
                  onRun={() => void runPreview()}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="button" variant="accent" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
