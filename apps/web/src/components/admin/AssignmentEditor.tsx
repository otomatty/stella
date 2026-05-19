/**
 * 課題 (assignment) を作成 / 編集するフルスクリーン Dialog。
 *
 * Tabs:
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash, Save, PlayCircle, Loader2 } from "@/lib/icons";
import { FileTabs } from "@/practice/components/FileTabs";
import { Editor } from "@/practice/components/Editor";
import type {
  AssignmentFile,
  Assignment,
  ASTRequirement,
  ChapterId,
  ESLintRuleConfig,
  Language,
  LintPreset,
  Stage,
  TestKind,
  TestCase,
  EvaluationResult,
  TestResult,
} from "@falcon/shared/types";
import { chapters } from "@falcon/shared/curriculum/chapters";
import { stages } from "@falcon/shared/curriculum/stages";
import { getStaticAnalysisSettings } from "@falcon/shared/assignment-helpers";
import { analyzeAst } from "@falcon/shared/grading";
import { runGrading } from "@falcon/code-runner/runners";
import {
  getAssignmentRow,
  upsertAssignment,
} from "@/lib/cms-api";
import { getLinter } from "@/practice/lib/linters";
import type { AssignmentRow } from "@falcon/shared/cms/types";

interface Props {
  tenantId: string;
  /** null = 新規作成 */
  assignmentId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

interface Draft {
  id: string;
  title: string;
  stage: Stage;
  chapterId: ChapterId;
  language: Language;
  testKind: TestKind;
  description: string;
  starterFiles: AssignmentFile[];
  entryFile: string;
  entryPoints: string;
  demoCall: string;
  sqlSeed: string;
  tests: TestCase[];
  lintPreset: LintPreset | "";
  astRequiredJson: string;
  astForbiddenJson: string;
  eslintRulesJson: string;
  /** 編集 UI 上のアクティブなスターターファイルパス */
  activeFile: string;
}

const STAGES: Stage[] = ["S0", "S1", "S2", "S3", "S4", "S5"];
const LANGUAGES: Language[] = ["javascript", "sql"];
const TEST_KINDS: TestKind[] = ["stdout", "function", "sql"];
const LINT_PRESETS: LintPreset[] = ["S1", "S2", "S3", "S4", "S5"];

function newDraft(): Draft {
  const id = `custom-${Math.random().toString(36).slice(2, 8)}`;
  const starter: AssignmentFile = { path: "main.js", content: "" };
  return {
    id,
    title: "新しい課題",
    stage: "S1",
    chapterId: "Ch00",
    language: "javascript",
    testKind: "stdout",
    description: "",
    starterFiles: [starter],
    entryFile: "main.js",
    entryPoints: "",
    demoCall: "",
    sqlSeed: "",
    tests: [{ name: "main", expectedStdout: "" } as TestCase],
    lintPreset: "",
    astRequiredJson: "[]",
    astForbiddenJson: "[]",
    eslintRulesJson: "{}",
    activeFile: "main.js",
  };
}

function fromRow(row: AssignmentRow): Draft {
  const ast = (row.static_analysis?.ast ?? {}) as ASTRequirement;
  const rules = (row.static_analysis?.eslint?.rules ?? {}) as Record<string, ESLintRuleConfig>;
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    chapterId: row.chapter_id,
    language: row.language,
    testKind: row.test_kind,
    description: row.description,
    starterFiles: row.starter_files,
    entryFile: row.entry_file ?? row.starter_files[0]?.path ?? "main.js",
    entryPoints: (row.entry_points ?? []).join(", "),
    demoCall: "",
    sqlSeed: row.sql_seed ?? "",
    tests: row.tests,
    lintPreset: row.lint_preset ?? "",
    astRequiredJson: JSON.stringify(ast.required ?? [], null, 2),
    astForbiddenJson: JSON.stringify(ast.forbidden ?? [], null, 2),
    eslintRulesJson: JSON.stringify(rules, null, 2),
    activeFile: row.starter_files[0]?.path ?? "main.js",
  };
}

interface PreviewResult {
  evaluation: EvaluationResult;
  results: TestResult[];
  error?: string;
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
    const astRequired = parseJsonOr<unknown[]>(draft.astRequiredJson, []);
    const astForbidden = parseJsonOr<unknown[]>(draft.astForbiddenJson, []);
    const eslintRules = parseJsonOr<Record<string, ESLintRuleConfig>>(
      draft.eslintRulesJson,
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
      const astRequired = parseJsonOr<unknown[]>(draft.astRequiredJson, []);
      const astForbidden = parseJsonOr<unknown[]>(draft.astForbiddenJson, []);
      const eslintRules = parseJsonOr<Record<string, ESLintRuleConfig>>(
        draft.eslintRulesJson,
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

// ---------------- sub forms ----------------

interface FormProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}

function MetaForm({ draft, update, disableId }: FormProps & { disableId: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Label htmlFor="ae-id">ID</Label>
        <Input
          id="ae-id"
          value={draft.id}
          disabled={disableId}
          onChange={(e) => update({ id: e.target.value })}
          className="font-mono text-[12.5px]"
        />
        <div className="text-[11px] text-ink-3 mt-1">
          保存後は変更不可。 一意な文字列を指定 (例: <code>S1-Ch01-print-hello</code>)
        </div>
      </div>
      <div className="col-span-2">
        <Label htmlFor="ae-title">タイトル</Label>
        <Input
          id="ae-title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="ae-stage">Stage</Label>
        <select
          id="ae-stage"
          value={draft.stage}
          onChange={(e) => update({ stage: e.target.value as Stage })}
          className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
          {STAGES.filter((s) => !stages.some((x) => x.id === s)).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="ae-ch">Chapter</Label>
        <select
          id="ae-ch"
          value={draft.chapterId}
          onChange={(e) => update({ chapterId: e.target.value as ChapterId })}
          className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
        >
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="ae-lang">言語</Label>
        <select
          id="ae-lang"
          value={draft.language}
          onChange={(e) => update({ language: e.target.value as Language })}
          className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="ae-tk">採点種別</Label>
        <select
          id="ae-tk"
          value={draft.testKind}
          onChange={(e) => update({ testKind: e.target.value as TestKind })}
          className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
        >
          {TEST_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="ae-ep">entryPoints (カンマ区切り)</Label>
        <Input
          id="ae-ep"
          value={draft.entryPoints}
          onChange={(e) => update({ entryPoints: e.target.value })}
          placeholder="sum, double"
        />
      </div>
      <div>
        <Label htmlFor="ae-demo">demoCall (function 採点用、 任意)</Label>
        <Input
          id="ae-demo"
          value={draft.demoCall}
          onChange={(e) => update({ demoCall: e.target.value })}
          placeholder="console.log(sum([1, 2, 3]))"
        />
      </div>
      <div className="col-span-3">
        <Label htmlFor="ae-desc">課題説明 (Markdown)</Label>
        <Textarea
          id="ae-desc"
          rows={6}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          className="font-mono text-[12.5px]"
        />
      </div>
    </div>
  );
}

interface FilesFormProps {
  files: AssignmentFile[];
  activeFile: string;
  entryFile: string;
  language: Language;
  eslintRulesJson: string;
  entryPoints: string;
  onSelect: (path: string) => void;
  onEditContent: (content: string) => void;
  onAdd: () => void;
  onRemove: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onToggleReadonly: () => void;
  onSetEntry: (path: string) => void;
}

function FilesForm({
  files,
  activeFile,
  entryFile,
  language,
  eslintRulesJson,
  entryPoints,
  onSelect,
  onEditContent,
  onAdd,
  onRemove,
  onRename,
  onToggleReadonly,
  onSetEntry,
}: FilesFormProps) {
  const current = files.find((f) => f.path === activeFile) ?? files[0];
  const eslintRules = useMemo(
    () => parseJsonOr<Record<string, ESLintRuleConfig>>(eslintRulesJson, {}),
    [eslintRulesJson],
  );
  const epList = useMemo(
    () => entryPoints.split(",").map((s) => s.trim()).filter(Boolean),
    [entryPoints],
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus size={13} />
          ファイル追加
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => {
          const next = prompt("新しいファイル名", current.path);
          if (next) onRename(current.path, next);
        }}>
          リネーム
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onSetEntry(current.path)}
          disabled={entryFile === current.path}
        >
          entryFile に指定
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onToggleReadonly}>
          {current.readonly ? "readonly 解除" : "readonly に切替"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onRemove(current.path)}
          disabled={files.length <= 1}
        >
          <Trash size={13} />
          削除
        </Button>
        <div className="ml-auto text-[11.5px] text-ink-3">
          entryFile: <span className="font-mono">{entryFile}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md flex flex-col" style={{ minHeight: 360 }}>
        <FileTabs files={files} activeFile={activeFile} onSelect={onSelect} />
        <div className="flex-1 min-h-0">
          <Editor
            code={current.content}
            onChange={onEditContent}
            eslintRules={eslintRules}
            entryPoints={epList}
            language={current.language ?? language}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  );
}

function TestsForm({ draft, update }: FormProps) {
  const [raw, setRaw] = useState(JSON.stringify(draft.tests, null, 2));
  const [rawMode, setRawMode] = useState(false);

  useEffect(() => {
    setRaw(JSON.stringify(draft.tests, null, 2));
  }, [draft.tests]);

  const applyRaw = () => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("配列形式にしてください");
      update({ tests: parsed as TestCase[] });
      toast.success("テスト定義を更新しました");
    } catch (err) {
      toast.error(`JSON が不正: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  if (rawMode) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="ae-tests-raw">Tests (Raw JSON)</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setRawMode(false)}>
              フォームに戻る
            </Button>
            <Button type="button" size="sm" variant="accent" onClick={applyRaw}>
              JSON を適用
            </Button>
          </div>
        </div>
        <Textarea
          id="ae-tests-raw"
          rows={18}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="font-mono text-[12px]"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] text-ink-3">
          testKind: <Badge>{draft.testKind}</Badge>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setRawMode(true)}>
            Raw JSON 編集
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const next = [...draft.tests, makeEmptyTest(draft.testKind)];
              update({ tests: next });
            }}
          >
            <Plus size={13} />
            テストを追加
          </Button>
        </div>
      </div>
      {draft.tests.map((t, idx) => (
        <TestRow
          key={idx}
          index={idx}
          testKind={draft.testKind}
          value={t}
          onChange={(next) => {
            const arr = [...draft.tests];
            arr[idx] = next;
            update({ tests: arr });
          }}
          onRemove={() => {
            const arr = draft.tests.filter((_, i) => i !== idx);
            update({ tests: arr });
          }}
        />
      ))}
    </div>
  );
}

function makeEmptyTest(kind: TestKind): TestCase {
  if (kind === "function") {
    return { name: "case", code: "true" } as TestCase;
  }
  if (kind === "sql") {
    return { name: "case", expectedRows: [] } as TestCase;
  }
  return { name: "case", expectedStdout: "" } as TestCase;
}

interface TestRowProps {
  index: number;
  testKind: TestKind;
  value: TestCase;
  onChange: (next: TestCase) => void;
  onRemove: () => void;
}

function TestRow({ index, testKind, value, onChange, onRemove }: TestRowProps) {
  return (
    <div className="bg-card border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge>#{index + 1}</Badge>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="テスト名"
          className="h-8 text-[12.5px]"
        />
        <Button type="button" size="icon-sm" variant="ghost" onClick={onRemove}>
          <Trash size={13} />
        </Button>
      </div>
      {testKind === "stdout" ? (
        <Textarea
          rows={3}
          value={("expectedStdout" in value ? value.expectedStdout : "") as string}
          onChange={(e) => onChange({ name: value.name, expectedStdout: e.target.value } as TestCase)}
          placeholder="期待される標準出力"
          className="font-mono text-[12px]"
        />
      ) : null}
      {testKind === "function" ? (
        <Input
          value={("code" in value ? value.code : "") as string}
          onChange={(e) => onChange({ name: value.name, code: e.target.value } as TestCase)}
          placeholder="例: sum([1,2,3]) === 6"
          className="font-mono text-[12.5px]"
        />
      ) : null}
      {testKind === "sql" ? (
        <SqlTestEditor value={value} onChange={onChange} />
      ) : null}
    </div>
  );
}

interface SqlTestEditorProps {
  value: TestCase;
  onChange: (next: TestCase) => void;
}

function SqlTestEditor({ value, onChange }: SqlTestEditorProps) {
  const rows = "expectedRows" in value ? value.expectedRows : [];
  const cols = "expectedColumns" in value ? value.expectedColumns : undefined;
  const query = "query" in value ? value.query : undefined;
  const [rowsRaw, setRowsRaw] = useState(JSON.stringify(rows, null, 2));
  useEffect(() => {
    setRowsRaw(JSON.stringify(rows, null, 2));
  }, [value]); // value 変化時に同期

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={query ?? ""}
        onChange={(e) => onChange({ ...(value as object), query: e.target.value || undefined, expectedRows: rows } as TestCase)}
        placeholder="(任意) 採点用 SELECT 文。 空なら学習者 SQL の最終結果を比較"
        className="font-mono text-[12px]"
      />
      <Input
        value={(cols ?? []).join(", ")}
        onChange={(e) => {
          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
          onChange({ ...(value as object), expectedColumns: list.length ? list : undefined, expectedRows: rows } as TestCase);
        }}
        placeholder="期待する列名 (カンマ区切り、 任意)"
        className="font-mono text-[12px]"
      />
      <Textarea
        rows={4}
        value={rowsRaw}
        onChange={(e) => setRowsRaw(e.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(rowsRaw) as unknown[][];
            onChange({ ...(value as object), expectedRows: parsed } as TestCase);
          } catch {
            toast.error("expectedRows が不正な JSON");
          }
        }}
        placeholder='例: [[1,"alice"],[2,"bob"]]'
        className="font-mono text-[12px]"
      />
    </div>
  );
}

function StaticAnalysisForm({ draft, update }: FormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="ae-lp">lintPreset</Label>
        <select
          id="ae-lp"
          value={draft.lintPreset}
          onChange={(e) => update({ lintPreset: e.target.value as LintPreset | "" })}
          className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
        >
          <option value="">(stage 既定を使用)</option>
          {LINT_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="text-[11.5px] text-ink-3 mt-1">
          stage に対応するプリセット ($S1$ ⇒ S1 preset) が暗黙で使われる。 個別ルールは下の JSON で上書き可能。
        </div>
      </div>
      <div>
        <Label htmlFor="ae-eslint">ESLint rules 上書き (JSON)</Label>
        <Textarea
          id="ae-eslint"
          rows={5}
          value={draft.eslintRulesJson}
          onChange={(e) => update({ eslintRulesJson: e.target.value })}
          className="font-mono text-[12px]"
          placeholder='例: {"no-var": "error"}'
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ae-astreq">AST required (JSON 配列)</Label>
          <Textarea
            id="ae-astreq"
            rows={8}
            value={draft.astRequiredJson}
            onChange={(e) => update({ astRequiredJson: e.target.value })}
            className="font-mono text-[12px]"
            placeholder='[{"kind":"method","name":"reduce"}]'
          />
        </div>
        <div>
          <Label htmlFor="ae-astfor">AST forbidden (JSON 配列)</Label>
          <Textarea
            id="ae-astfor"
            rows={8}
            value={draft.astForbiddenJson}
            onChange={(e) => update({ astForbiddenJson: e.target.value })}
            className="font-mono text-[12px]"
            placeholder='[{"kind":"node","nodeType":"ForStatement"}]'
          />
        </div>
      </div>
      <div className="text-[11.5px] text-ink-3">
        AST パターンの kind: <code>method</code> / <code>node</code> / <code>console-log</code> /{" "}
        <code>const-declaration</code> / <code>var</code> / <code>loose-eq</code> /{" "}
        <code>async-fn</code> — 詳細は packages/shared/src/types.ts の{" "}
        <code>ASTPattern</code> を参照。
      </div>
    </div>
  );
}

interface PreviewPanelProps {
  previewing: boolean;
  preview: PreviewResult | null;
  onRun: () => void;
}

function PreviewPanel({ previewing, preview, onRun }: PreviewPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] text-ink-3">
          現在のドラフトを採点ランナーで実行し、 starterFiles の中身でテストが pass するか確認します。
        </div>
        <Button type="button" variant="accent" disabled={previewing} onClick={onRun}>
          {previewing ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
          保存前にテスト
        </Button>
      </div>
      {preview?.error ? (
        <div className="rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          実行エラー: {preview.error}
        </div>
      ) : null}
      {preview ? (
        <>
          <div className="flex gap-2 text-[12px]">
            <Badge variant={preview.evaluation.cleared ? "success" : "danger"}>
              cleared: {String(preview.evaluation.cleared)}
            </Badge>
            <Badge variant={preview.evaluation.checks.testsPassed ? "success" : "danger"}>
              tests: {String(preview.evaluation.checks.testsPassed)}
            </Badge>
            <Badge variant={preview.evaluation.checks.lintPassed ? "success" : "danger"}>
              lint: {String(preview.evaluation.checks.lintPassed)}
            </Badge>
            <Badge variant={preview.evaluation.checks.astPassed ? "success" : "danger"}>
              ast: {String(preview.evaluation.checks.astPassed)}
            </Badge>
          </div>
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-sunken">
                <tr className="text-left">
                  <th className="px-2 py-1">name</th>
                  <th className="px-2 py-1">passed</th>
                  <th className="px-2 py-1">expected</th>
                  <th className="px-2 py-1">stdout</th>
                  <th className="px-2 py-1">error</th>
                </tr>
              </thead>
              <tbody>
                {preview.results.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1 font-medium">{r.name}</td>
                    <td className="px-2 py-1">
                      <Badge variant={r.passed ? "success" : "danger"}>
                        {r.passed ? "pass" : "fail"}
                      </Badge>
                    </td>
                    <td className="px-2 py-1 font-mono">
                      <pre className="whitespace-pre-wrap text-[11px]">{r.expectedStdout ?? ""}</pre>
                    </td>
                    <td className="px-2 py-1 font-mono">
                      <pre className="whitespace-pre-wrap text-[11px]">{r.stdout ?? ""}</pre>
                    </td>
                    <td className="px-2 py-1 text-destructive font-mono text-[11px]">
                      {r.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function parseJsonOr<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
