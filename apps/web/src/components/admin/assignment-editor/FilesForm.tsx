/**
 * AssignmentEditor「スターターファイル」タブ。
 * 既存 `FileTabs` + `Editor` を再利用し、 admin 用にファイル追加/削除/リネーム/
 * readonly トグル / entryFile 指定を追加する。
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "@/lib/icons";
import { FileTabs } from "@/practice/components/FileTabs";
import { Editor } from "@/practice/components/Editor";
import type { AssignmentFile, ESLintRuleConfig, Language } from "@falcon/shared/types";

import { parseJsonOr } from "./draft";

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

export function FilesForm({
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
    () =>
      entryPoints
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [entryPoints],
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus size={13} />
          ファイル追加
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const next = prompt("新しいファイル名", current.path);
            if (next) onRename(current.path, next);
          }}
        >
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

      <div className="bg-card border border-border rounded-md flex flex-col min-h-[360px]">
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
