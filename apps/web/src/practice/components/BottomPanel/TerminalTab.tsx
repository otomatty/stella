/**
 * 下部パネル「ターミナル」タブ。 SQL 課題で sql.js セッションへ対話実行できる REPL (#109)。
 *
 * - xterm.js は dynamic import (~200KB) で初回のみロード
 * - `@xterm/addon-fit` でコンテナサイズに追従
 * - 行入力は `Enter` で確定 (multi-line は未対応、 1 行 1 SQL のシンプル運用)
 * - `(assignmentId, seedHash)` キーの terminal セッションを `sql-terminal.ts` で管理し、
 *   採点用 DB とは独立 (ターミナルから `DROP` しても採点に影響しない)
 */

import { useEffect, useRef, useState } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import type { FitAddon as XtermFitAddon } from "@xterm/addon-fit";

import {
  disposeTerminalSession,
  getTerminalSession,
  type TerminalExecResult,
} from "../../lib/sql-terminal.js";

interface Props {
  enabled: boolean;
  assignmentId: string;
  seed: string;
}

// 単純な once-promise メモ化 (元実装の memoizePromiseFactory 相当)。
function memoizePromiseFactory<T>(
  factory: () => Promise<T>,
): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    if (cached === null) {cached = factory();}
    return cached;
  };
}

// xterm + addon-fit + xterm.css を dynamic import で 1 度だけ読み込む。
// 動的 import モジュールから直接型を引くことで、 type-only import の typeof 経由ではなく
// 実際のランタイム値の型を反映する (CodeRabbit Critical 指摘)。
type XtermBundle = {
  Terminal: typeof import("@xterm/xterm").Terminal;
  FitAddon: typeof import("@xterm/addon-fit").FitAddon;
};
const loadXterm = memoizePromiseFactory(async (): Promise<XtermBundle> => {
  const [xtermMod, fitMod] = await Promise.all([
    import("@xterm/xterm"),
    import("@xterm/addon-fit"),
    import("@xterm/xterm/css/xterm.css"),
  ]);
  return { Terminal: xtermMod.Terminal, FitAddon: fitMod.FitAddon };
});

// sql.js も dynamic import (terminal セッション用)。 採点ランナと同じ wasm モジュールを共有する。
type InitSqlJs = (config?: { locateFile?: (file: string) => string }) => Promise<{
  Database: new () => {
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
    close(): void;
  };
}>;
const loadSqlJsForTerminal = memoizePromiseFactory(async () => {
  const mod = (await import("sql.js")) as unknown as { default: InitSqlJs };
  return mod.default({ locateFile: (f: string) => `/sqljs/${f}` });
});

const ESC = "\x1b";

export function TerminalTab({ enabled, assignmentId, seed }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // sessionId が変わるたびに terminal を作り直す。
  const sessionId = `${assignmentId}::${seed}`;

  useEffect(() => {
    if (!enabled) {return;}
    const container = containerRef.current;
    if (!container) {return;}

    let cancelled = false;
    let terminal: XtermTerminal | null = null;
    let fitAddon: XtermFitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let session: Awaited<ReturnType<typeof getTerminalSession>> | null = null;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [{ Terminal, FitAddon }, terminalSession] = await Promise.all([
          loadXterm(),
          getTerminalSession(assignmentId, seed, loadSqlJsForTerminal),
        ]);
        if (cancelled) {return;}
        session = terminalSession;
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          theme: { background: "#0b1020" },
          convertEol: true,
        });
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(container);
        fitAddon.fit();

        terminal.writeln(`${ESC}[1;36mSQL Terminal${ESC}[0m (sql.js / SQLite)`);
        terminal.writeln(
          "1 行に SQL を 1 文書いて Enter で実行します。 採点 DB とは別の独立セッションです。",
        );
        writePrompt(terminal);

        let buffer = "";
        terminal.onData((data: string) => {
          if (!terminal || !session) {return;}
          // 矢印キー (`\x1b[D`) などの ANSI エスケープシーケンスが buffer に紛れて
          // SQL を壊さないよう、 ESC で始まる CSI シーケンスはスキップする (gemini medium 対応)。
          let i = 0;
          while (i < data.length) {
            const ch = data[i];
            const code = ch.charCodeAt(0);
            if (code === 0x1b /* ESC */) {
              if (data[i + 1] === "[") {
                // CSI: ESC '[' (parameter / intermediate bytes)* final-byte
                let j = i + 2;
                while (j < data.length) {
                  const cj = data.charCodeAt(j);
                  if ((cj >= 0x30 && cj <= 0x3f) || (cj >= 0x20 && cj <= 0x2f)) {
                    j++;
                    continue;
                  }
                  if (cj >= 0x40 && cj <= 0x7e) {
                    j++;
                  }
                  break;
                }
                i = j;
                continue;
              }
              // それ以外の ESC シーケンスは ESC + 次の 1 文字をまとめて捨てる。
              i += 2;
              continue;
            }
            if (ch === "\r") {
              terminal.writeln("");
              const sql = buffer.trim();
              buffer = "";
              if (sql.length > 0) {
                const results = session.exec(sql);
                writeResults(terminal, results);
              }
              writePrompt(terminal);
            } else if (code === 0x7f /* Backspace */) {
              if (buffer.length > 0) {
                buffer = buffer.slice(0, -1);
                terminal.write("\b \b");
              }
            } else if (code === 0x03 /* Ctrl+C */) {
              terminal.writeln("^C");
              buffer = "";
              writePrompt(terminal);
            } else if (code >= 0x20) {
              buffer += ch;
              terminal.write(ch);
            }
            i++;
          }
        });

        // コンテナサイズ変化に追従。
        resizeObserver = new ResizeObserver(() => {
          try {
            fitAddon?.fit();
          } catch {
            // ignore (アンマウント直後等)
          }
        });
        resizeObserver.observe(container);

        setLoading(false);
      } catch (e) {
        if (cancelled) {return;}
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      terminal?.dispose();
      // sessionId 切替 / コンポーネントアンマウント時にも前の DB セッションを破棄。
      // これがないと assignmentId / seed だけ変わったときに古い in-memory DB が残り続ける
      // (coderabbit major 対応)。
      disposeTerminalSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId]);

  if (!enabled) {
    return (
      <div className="flex flex-col">
        <div className="border-b border-border bg-card/60 px-6 py-1.5">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            ターミナル
          </span>
        </div>
        <div className="bg-background px-6 py-3 font-sans text-[12px] text-muted-foreground">
          この課題ではターミナルは利用できません。 SQL 課題で有効になります。
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[40vh] min-h-[200px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-1.5">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          ターミナル (sql.js)
        </span>
        {loading ? (
          <span className="font-sans text-[11px] text-muted-foreground">
            読み込み中...
          </span>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1 bg-[#0b1020]">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      {error ? (
        <div className="border-t border-destructive/30 bg-destructive/5 px-6 py-2 font-sans text-[12px] text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function writePrompt(terminal: XtermTerminal): void {
  terminal.write(`${ESC}[1;32msql>${ESC}[0m `);
}

function writeResults(
  terminal: XtermTerminal,
  results: TerminalExecResult[],
): void {
  if (results.length === 0) {
    terminal.writeln("(OK)");
    return;
  }
  for (const r of results) {
    if (r.error) {
      terminal.writeln(`${ESC}[31mERROR:${ESC}[0m ${r.error}`);
      continue;
    }
    if (r.rows.length === 0) {
      terminal.writeln("(no rows)");
      continue;
    }
    const widths = r.columns.map((c, i) => {
      let w = visualWidth(c);
      for (const row of r.rows) {
        const cell = formatCell(row[i]);
        const cw = visualWidth(cell);
        if (cw > w) {w = cw;}
      }
      return Math.min(w, 32);
    });
    terminal.writeln(
      r.columns
        .map((c, i) => padEndVisual(truncateVisual(c, widths[i]), widths[i]))
        .join(" | "),
    );
    terminal.writeln(widths.map((w) => "-".repeat(w)).join("-+-"));
    for (const row of r.rows) {
      terminal.writeln(
        row
          .map((v, i) =>
            padEndVisual(truncateVisual(formatCell(v), widths[i]), widths[i]),
          )
          .join(" | "),
      );
    }
  }
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) {return "NULL";}
  if (typeof v === "string") {return v;}
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
    return String(v);
  }
  try {
    return JSON.stringify(v) ?? "(?)";
  } catch {
    return "(?)";
  }
}

/**
 * ターミナル上での視覚幅 (cell 数) を返す。 ASCII = 1、 CJK / 全角 = 2 とみなす。
 * SQL の seed に日本語などの全角文字が含まれる場合に表の列揃えが崩れないようにする
 * (gemini medium 対応 / #109)。
 */
function visualWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (isWide(code)) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

function isWide(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) /* Hangul Jamo */ ||
    (code >= 0x2e80 && code <= 0x303e) /* CJK Radicals / 記号 */ ||
    (code >= 0x3041 && code <= 0x33ff) /* ひらがな / カタカナ / CJK 記号 */ ||
    (code >= 0x3400 && code <= 0x4dbf) /* CJK Ext A */ ||
    (code >= 0x4e00 && code <= 0x9fff) /* CJK 基本 */ ||
    (code >= 0xa000 && code <= 0xa4cf) /* Yi */ ||
    (code >= 0xac00 && code <= 0xd7a3) /* Hangul Syllables */ ||
    (code >= 0xf900 && code <= 0xfaff) /* CJK 互換 */ ||
    (code >= 0xfe30 && code <= 0xfe4f) /* CJK 互換 (記号) */ ||
    (code >= 0xff00 && code <= 0xff60) /* 全角 */ ||
    (code >= 0xffe0 && code <= 0xffe6) /* 全角 */ ||
    (code >= 0x1f300 && code <= 0x1f6ff) /* Misc Symbols / Emoji */ ||
    (code >= 0x1f900 && code <= 0x1f9ff) /* Supplemental Symbols */
  );
}

function padEndVisual(s: string, width: number): string {
  const w = visualWidth(s);
  if (w >= width) {return s;}
  return s + " ".repeat(width - w);
}

/**
 * 視覚幅 `width` を超える場合は末尾を `…` に置き換えて切り詰める。
 * セル幅キャップ (32) が実際に列揃えに効くようにするための補助 (coderabbit minor 対応)。
 */
function truncateVisual(s: string, width: number): string {
  if (visualWidth(s) <= width) {return s;}
  if (width <= 1) {return "…";}
  const cap = width - 1; // "…" 用に 1 セル確保
  let out = "";
  for (const ch of s) {
    if (visualWidth(out + ch) > cap) {break;}
    out += ch;
  }
  return out + "…";
}
