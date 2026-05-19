/**
 * 下部パネル「出力」タブ。
 *
 * 旧 `OutputPane` のレイアウトを踏襲しつつ、 上部のタブヘッダで状態を切り替える前提で
 * 自前のヘッダは削除した薄いバージョン。 自由実行 (`▶ 実行` / `▶ 関数を試す`) の
 * stdout / error をそのまま表示する。
 */

import { cn } from "@/lib/utils";

interface Props {
  stdout?: string;
  error?: string;
  running: boolean;
  onClear: () => void;
}

export function OutputTab({ stdout, error, running, onClear }: Props) {
  const hasResult = stdout !== undefined || error !== undefined;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-1.5">
        <div className="flex items-center gap-2">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            stdout
          </span>
          {running ? (
            <span className="font-sans text-[11px] text-muted-foreground">
              実行中...
            </span>
          ) : null}
          {!running && error ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-[2px] font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-destructive">
              ERROR
            </span>
          ) : null}
        </div>
        {hasResult && !running ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-border bg-background px-2 py-[2px] font-sans text-[11px] text-muted-foreground transition-colors hover:border-ink-300 hover:text-foreground dark:hover:border-ink-600"
          >
            クリア
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "max-h-[28vh] overflow-auto bg-background px-6 py-2.5 font-mono text-[12.5px] leading-[1.55]",
          error ? "text-destructive" : "text-foreground",
        )}
      >
        {!hasResult && !running ? (
          <p className="font-sans text-[12px] text-muted-foreground">
            「実行」ボタンを押すとコードの出力がここに表示されます。
          </p>
        ) : null}
        {running && !hasResult ? (
          <p className="font-sans text-[12px] text-muted-foreground">
            コードを実行しています...
          </p>
        ) : null}
        {error ? (
          <pre className="m-0 whitespace-pre-wrap break-words">{error}</pre>
        ) : null}
        {!error && stdout !== undefined ? (
          stdout.length === 0 ? (
            <p className="font-sans text-[12px] text-muted-foreground">
              (出力はありません)
            </p>
          ) : (
            <pre className="m-0 whitespace-pre-wrap break-words">{stdout}</pre>
          )
        ) : null}
      </div>
    </div>
  );
}
