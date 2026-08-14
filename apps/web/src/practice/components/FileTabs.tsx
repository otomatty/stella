/**
 * エディタ上部の VSCode 風ファイルタブ。
 *
 * - `files` の `path` 一覧をタブとして表示
 * - クリックで `activeFile` を切り替える
 * - `readonly` ファイルには小さなバッジを出す (例: `utils.js` (読取専用))
 * - 単一ファイルでも 1 タブだけ表示 (UI 回帰なし)
 * - WAI-ARIA tablist パターン: ArrowLeft/Right で循環移動、 Home/End で先頭/末尾、
 *   roving tabindex (`tabIndex={isActive ? 0 : -1}`) で支援技術ユーザを考慮 (coderabbit 対応)。
 *
 * ルート要素には VSCode 風のタブを示す `data-file-tabs` を付与する。
 */

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";
import type { AssignmentFile } from "@falcon/shared/types";

interface Props {
  files: AssignmentFile[];
  activeFile: string;
  onSelect: (path: string) => void;
}

export function FileTabs({ files, activeFile, onSelect }: Props) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // activeFile が files に無い (= 想定外の path) 場合、 全タブが tabIndex=-1 になって
  // Tab キーで誰も到達できなくなる。 最低 1 つはフォーカス可能にするためのフォールバック index
  // を計算する (coderabbit minor 対応)。
  const hasActiveFile = files.some((f) => f.path === activeFile);

  const moveFocus = (nextIndex: number) => {
    if (files.length === 0) {return;}
    const wrapped = ((nextIndex % files.length) + files.length) % files.length;
    onSelect(files[wrapped].path);
    // 次フォーカスは render 反映後に行う (現タブ要素から自然遷移)。
    queueMicrotask(() => {
      tabRefs.current[wrapped]?.focus();
    });
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveFocus(index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(index - 1);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(0);
        break;
      case "End":
        event.preventDefault();
        moveFocus(files.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      data-file-tabs
      role="tablist"
      aria-label="エディタファイルタブ"
      className="flex items-stretch gap-px overflow-x-auto border-b border-border bg-muted/30 px-2 pt-1.5 text-[12px] font-sans"
    >
      {files.map((file, index) => {
        const isActive = file.path === activeFile;
        // activeFile が存在しないときは先頭タブをフォーカス可能にする (aria-selected は false のまま)。
        const isFocusable = isActive || (!hasActiveFile && index === 0);
        return (
          <button
            key={file.path}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isFocusable ? 0 : -1}
            onClick={() => onSelect(file.path)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "group relative inline-flex items-center gap-1.5 rounded-t-md border border-b-0 border-transparent px-3 py-1.5 transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-border bg-background text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="font-mono">{file.path}</span>
            {file.readonly ? (
              <span
                className="inline-flex items-center rounded-sm bg-muted px-1 py-[1px] text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                title="読み取り専用 (採点対象外)"
              >
                ro
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
