/**
 * AssignmentEditor「プレビュー」タブ。
 * `runGrading` の結果 (evaluation + テスト別の pass/fail) をテーブル表示する。
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Loader2 } from "@/lib/icons";

import type { PreviewResult } from "./draft";

interface PreviewPanelProps {
  previewing: boolean;
  preview: PreviewResult | null;
  onRun: () => void;
}

export function PreviewPanel({ previewing, preview, onRun }: PreviewPanelProps) {
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
