/**
 * AssignmentEditor「メタ情報」タブ。
 * id / title / stage / chapter / language / testKind / entryPoints / demoCall / description。
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChapterId, Language, Stage, TestKind } from "@falcon/shared/types";
import { chapters } from "@falcon/shared/curriculum/chapters";
import { stages } from "@falcon/shared/curriculum/stages";

import { LANGUAGES, STAGES, TEST_KINDS, type FormProps } from "./draft";

export function MetaForm({ draft, update, disableId }: FormProps & { disableId: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      <div className="col-span-1 sm:col-span-2">
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
      <div className="col-span-1 sm:col-span-3">
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
