/**
 * AssignmentEditor「静的解析」タブ (JS のみ)。
 * lintPreset + ESLint rules 上書き + AST required/forbidden の JSON 編集。
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LintPreset } from "@stella/shared/types";

import { LINT_PRESETS, type FormProps } from "./draft";

export function StaticAnalysisForm({ draft, update }: FormProps) {
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
          stage に対応するプリセット ($S1$ ⇒ S1 preset) が暗黙で使われる。 個別ルールは下の JSON
          で上書き可能。
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <code>async-fn</code> — 詳細は packages/shared/src/types.ts の <code>ASTPattern</code>{" "}
        を参照。
      </div>
    </div>
  );
}
