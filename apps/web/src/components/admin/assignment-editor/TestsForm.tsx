/**
 * AssignmentEditor「テスト」タブ。
 * testKind 別の構造化フォーム + 「Raw JSON 編集」 フォールバック。
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash } from "@/lib/icons";
import type { SqlTestCase, TestCase, TestKind } from "@falcon/shared/types";

import type { FormProps } from "./draft";

export function TestsForm({ draft, update }: FormProps) {
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
    return { name: "case", code: "true" };
  }
  if (kind === "sql") {
    return { name: "case", expectedRows: [] };
  }
  return { name: "case", expectedStdout: "" };
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
          onChange={(e) => onChange({ name: value.name, expectedStdout: e.target.value })}
          placeholder="期待される標準出力"
          className="font-mono text-[12px]"
        />
      ) : null}
      {testKind === "function" ? (
        <Input
          value={("code" in value ? value.code : "") as string}
          onChange={(e) => onChange({ name: value.name, code: e.target.value })}
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
  const rowsJson = JSON.stringify(rows, null, 2);
  const [rowsRaw, setRowsRaw] = useState(rowsJson);
  // expectedRows が外部更新されたときだけ textarea を同期する。
  // value 全体に依存すると query / 列名の編集中に未保存の rowsRaw がリセットされてしまう。
  useEffect(() => {
    setRowsRaw(rowsJson);
  }, [rowsJson]);

  // 既知のフィールドから SqlTestCase を明示的に組み立てる (broad な object cast を避ける)。
  const emit = (patch: Partial<Omit<SqlTestCase, "name">>) => {
    onChange({
      name: value.name,
      query,
      expectedColumns: cols,
      expectedRows: rows,
      ...patch,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={query ?? ""}
        onChange={(e) => emit({ query: e.target.value || undefined })}
        placeholder="(任意) 採点用 SELECT 文。 空なら学習者 SQL の最終結果を比較"
        className="font-mono text-[12px]"
      />
      <Input
        value={(cols ?? []).join(", ")}
        onChange={(e) => {
          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
          emit({ expectedColumns: list.length ? list : undefined });
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
            const parsed: unknown = JSON.parse(rowsRaw);
            // JSON として valid でも配列以外 (オブジェクト等) は expectedRows に使えない。
            if (!Array.isArray(parsed)) throw new Error("配列形式にしてください");
            emit({ expectedRows: parsed as SqlTestCase["expectedRows"] });
          } catch (err) {
            toast.error(
              `expectedRows が不正 (${err instanceof Error ? err.message : "JSON エラー"})。 元の値に戻します`,
            );
            setRowsRaw(JSON.stringify(rows, null, 2));
          }
        }}
        placeholder='例: [[1,"alice"],[2,"bob"]]'
        className="font-mono text-[12px]"
      />
    </div>
  );
}
