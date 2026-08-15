/**
 * 横断検索パレット (Issue #77)。
 *
 * Topbar のダミー検索ボックスを置き換える実装。 `⌘K` / `Ctrl+K` で開き、
 * `GET /api/search` の結果 (コース / レッスン) を選ぶと該当画面へ遷移する。
 * ↑ ↓ で候補移動、 Enter で決定、 Esc で閉じる。
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { SearchResult } from "@falcon/shared/search/types";
import { Book, Loader2, Search } from "@/lib/icons";
import { LessonTypeIcon } from "@/components/learner/CourseDetail";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSearch } from "@/hooks/useSearch";
import { filterSearchResultsForPreview } from "@/lib/ui-role";
import { cn } from "@/lib/utils";

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: SearchResult) => void;
  /** 受講者プレビュー時は公開講座の ID。 null なら API 結果をそのまま出す。 */
  allowedCourseIds?: ReadonlySet<string> | null;
}

export const SearchPalette = ({
  open,
  onOpenChange,
  onSelect,
  allowedCourseIds = null,
}: SearchPaletteProps) => {
  const [input, setInput] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { results: rawResults, loading, error, tooShort, unavailable } = useSearch(input, open);
  const results = useMemo(
    () => filterSearchResultsForPreview(rawResults, allowedCourseIds),
    [rawResults, allowedCourseIds],
  );

  // 開くたびに入力をリセットする (前回の検索語が残らないように)。
  useEffect(() => {
    if (open) {
      setInput("");
      setActiveIndex(0);
    }
  }, [open]);

  // 候補が入れ替わったら選択位置を先頭へ戻す。
  // biome-ignore lint/correctness/useExhaustiveDependencies: results 入替で選択を先頭へ戻す
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // ハイライト中の行を可視領域に入れる。
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIndex 変更で可視領域へ入れる
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const emptyMessage = useMemo(() => {
    if (unavailable) return "検索はバックエンド接続時のみ利用できます。";
    if (error) return `検索に失敗しました: ${error}`;
    if (tooShort) return "2文字以上入力してください。";
    if (loading) return null;
    return "一致するコース・レッスンはありません。";
  }, [unavailable, error, tooShort, loading]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    onSelect(result);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) handleSelect(target);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(calc(100vw-2rem),620px)] top-[18%] translate-y-0 p-0"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">コース・レッスンを検索</DialogTitle>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <Search size={15} className="text-ink-3 shrink-0" />
          {/* コマンドパレットは開いた直後にそのまま打てることが前提のため autoFocus。 */}
          <input
            // biome-ignore lint/a11y/noAutofocus: 検索パレットは開いた瞬間に入力できる必要がある
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="コース・レッスンを検索…"
            aria-label="コース・レッスンを検索"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm placeholder:text-ink-3"
          />
          {loading ? <Loader2 size={14} className="animate-spin text-ink-3" /> : null}
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-ink-3">
              {emptyMessage ?? "検索中…"}
            </div>
          ) : (
            results.map((result, i) => (
              <button
                type="button"
                key={`${result.kind}:${result.id}`}
                data-active={i === activeIndex}
                onMouseMove={() => setActiveIndex(i)}
                onClick={() => handleSelect(result)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-4 py-2.5 text-left",
                  i === activeIndex ? "bg-sunken" : "",
                )}
              >
                <span className="shrink-0 mt-0.5 text-ink-3">
                  {result.kind === "lesson" && result.lesson_type ? (
                    <LessonTypeIcon type={result.lesson_type} size={14} />
                  ) : (
                    <Book size={14} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] truncate">{result.title}</div>
                  {result.subtitle ? (
                    <div className="text-[11.5px] text-ink-3 truncate mt-0.5">
                      {result.subtitle}
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] text-ink-3 mt-0.5">
                  {result.kind === "course" ? "コース" : "レッスン"}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-[11px] text-ink-3">
          <span>
            <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> 選択
          </span>
          <span>
            <kbd className="font-mono">Enter</kbd> 開く
          </span>
          <span>
            <kbd className="font-mono">Esc</kbd> 閉じる
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
