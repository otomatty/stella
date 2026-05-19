/**
 * 課題ごとの進捗 (編集中ファイル群 + クリア状態) を localStorage と同期する Hook。
 *
 * - 課題が切り替わったら storage から読み込み、なければ `starterFiles` を返す
 * - `updateFile(path, content)` でファイル単位に書き換え、 debounce してエントリ全体を書き込む
 * - `setActiveFile(path)` で現在のアクティブタブ (将来 #106 で UI に出る) を切り替える
 * - `recordResult` で cleared を OR 更新する (一度クリアした課題は失敗しても外れない)
 * - `clear` でエントリを削除し、`starterFiles` に戻す
 *
 * 互換 shim:
 * - `code` / `setCode` は `files[activeFile]` / `updateFile(activeFile, ...)` の薄いラッパ。
 *   #106 で UI が完全多ファイル化されたら呼び出し側で `files`/`updateFile` に置き換える。
 * - `recordResult(passed, submittedCode)` は単一ファイル API も維持し、 内部で
 *   `lastFiles[activeFile] = submittedCode` に詰め替える。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { AssignmentFile } from "@falcon/shared/types";

import {
  deleteEntry,
  loadEntry,
  saveEntry,
  type ProgressEntry,
} from "../lib/progress-store.js";

const SAVE_DEBOUNCE_MS = 400;

interface Args {
  assignmentId: string;
  starterFiles: AssignmentFile[];
  entryFile: string;
}

interface ProgressApi {
  /** path → 編集中コンテンツ。 */
  files: Record<string, string>;
  /** UI で現在表示中のファイル path。 単一ファイル課題では entryFile と等しい。 */
  activeFile: string;
  setActiveFile: (path: string) => void;
  updateFile: (path: string, content: string) => void;
  cleared: boolean;
  /**
   * 評価完了直後に呼び出す。`passed === true` の場合に cleared を立てる。
   * `submittedCode` は entryFile (= 採点対象) の内容として `lastFiles` に保存される。
   * 採点中に課題切替があっても元の課題に紐付くよう、 呼び出し側で run() 起動時に固定すること。
   */
  recordResult: (passed: boolean, submittedCode: string) => void;
  /** storage の entry を消し、starterFiles に戻す。 */
  clear: () => void;
  // ─── 単一ファイル時代の互換 shim (#106 で除去予定) ───
  /** `files[activeFile]` のショートカット。 */
  code: string;
  /** `updateFile(activeFile, next)` のショートカット。 */
  setCode: (next: string) => void;
}

interface InternalState {
  files: Record<string, string>;
  activeFile: string;
  cleared: boolean;
}

function starterFilesToRecord(starter: AssignmentFile[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of starter) {
    out[f.path] = f.content;
  }
  return out;
}

function readInitial(
  assignmentId: string,
  starter: AssignmentFile[],
  entryFile: string,
): InternalState {
  const entry = loadEntry(assignmentId);
  if (!entry) {
    return {
      files: starterFilesToRecord(starter),
      activeFile: entryFile,
      cleared: false,
    };
  }
  // 保存済みエントリには starter に存在しないファイルが含まれる可能性は当面無いが、
  // 課題側で starter が増えた場合に備えて starter をベースにマージする。
  const baseline = starterFilesToRecord(starter);
  const merged: Record<string, string> = { ...baseline, ...entry.lastFiles };
  const validActive =
    entry.activeFile && merged[entry.activeFile] !== undefined
      ? entry.activeFile
      : entryFile;
  return {
    files: merged,
    activeFile: validActive,
    cleared: entry.cleared,
  };
}

export function useProgress({ assignmentId, starterFiles, entryFile }: Args): ProgressApi {
  // 3 つの state を 1 つの構造で管理することで、 初回マウントの readInitial を 1 回に抑える。
  const [state, setState] = useState<InternalState>(() =>
    readInitial(assignmentId, starterFiles, entryFile),
  );
  const { files, activeFile, cleared } = state;
  // recordResult から最新の files / activeFile を closure に頼らず参照するための ref。
  // useCallback の依存に state.* を入れると毎レンダ recordResult が作り直されるのを避けつつ、
  // saveEntry を setState 外で 1 回だけ呼ぶための補助 (coderabbit nitpick 対応)。
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // 課題切替時、storage から再ロード
  const lastAssignmentRef = useRef<string>(assignmentId);
  useEffect(() => {
    if (lastAssignmentRef.current === assignmentId) {return;}
    lastAssignmentRef.current = assignmentId;
    setState(readInitial(assignmentId, starterFiles, entryFile));
  }, [assignmentId, starterFiles, entryFile]);

  // ファイル変更を debounce して localStorage に保存
  useEffect(() => {
    const timer = setTimeout(() => {
      const existing = loadEntry(assignmentId);
      const starterRecord = starterFilesToRecord(starterFiles);
      // 完全に starter と一致 (新規ノイズ) + activeFile も既定 → entry を作らない
      const isPristine =
        !existing &&
        sameRecord(files, starterRecord) &&
        activeFile === entryFile;
      if (isPristine) {return;}
      const nextCleared = existing?.cleared ?? cleared;
      saveEntry(
        assignmentId,
        {
          cleared: nextCleared,
          lastFiles: files,
          activeFile,
          lastSubmittedAt: existing?.lastSubmittedAt,
        },
        { previousCleared: existing?.cleared ?? null },
      );
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [files, activeFile, assignmentId, entryFile, cleared, starterFiles]);

  const setActiveFile = useCallback((path: string) => {
    setState((s) => (s.activeFile === path ? s : { ...s, activeFile: path }));
  }, []);

  const updateFile = useCallback((path: string, content: string) => {
    setState((s) => {
      if (s.files[path] === content) {return s;}
      return { ...s, files: { ...s.files, [path]: content } };
    });
  }, []);

  const setCode = useCallback((next: string) => {
    setState((s) => {
      if (s.files[s.activeFile] === next) {return s;}
      return { ...s, files: { ...s.files, [s.activeFile]: next } };
    });
  }, []);

  const recordResult = useCallback(
    (passed: boolean, submittedCode: string) => {
      // codex P1 対応: storage から `lastFiles` を読み戻すと、 400ms debounce 前の編集が消える
      // ため、 必ず現在の in-memory state (`s.files`) を基底にする。
      // setState の更新関数は StrictMode で 2 回呼ばれることがあるため副作用 (saveEntry) を
      // 入れず、 nextFiles を計算した直後に saveEntry → setState の順で呼ぶ
      // (coderabbit nitpick 対応)。
      const existing = loadEntry(assignmentId);
      const prev = existing?.cleared ?? false;
      const nextCleared = prev || passed;
      const isCurrentAssignment = lastAssignmentRef.current === assignmentId;
      // ref で latest state を読む — closure 経由だと dep を増やすかスタイル違反になる。
      const latest = stateRef.current;
      // 採点中に別課題へ切り替えていても、 採点開始時の assignmentId に対する結果は
      // 必ず storage に書き込む (CodeRabbit 指摘: クリア瞬間を取りこぼさない)。
      // ただし latest.files は新課題の内容なので、 別課題なら storage 側の既存ファイル
      // を基底にして submittedCode だけを反映する。
      const baseFiles = isCurrentAssignment
        ? latest.files
        : (existing?.lastFiles ?? { [entryFile]: submittedCode });
      const nextFiles: Record<string, string> = {
        ...baseFiles,
        [entryFile]: submittedCode,
      };
      const entry: ProgressEntry = {
        cleared: nextCleared,
        lastFiles: nextFiles,
        activeFile: isCurrentAssignment
          ? latest.activeFile
          : (existing?.activeFile ?? entryFile),
        lastSubmittedAt: Date.now(),
      };
      saveEntry(assignmentId, entry, {
        previousCleared: existing?.cleared ?? null,
      });
      // local state は現課題に一致するときのみ更新する (古い課題の cleared を
      // 新課題のヘッダに反映してしまうのを防ぐ)。
      if (isCurrentAssignment) {
        setState((s) => ({ ...s, cleared: nextCleared, files: nextFiles }));
      }
    },
    [assignmentId, entryFile],
  );

  const clear = useCallback(() => {
    deleteEntry(assignmentId);
    setState({
      files: starterFilesToRecord(starterFiles),
      activeFile: entryFile,
      cleared: false,
    });
  }, [assignmentId, starterFiles, entryFile]);

  return {
    files,
    activeFile,
    setActiveFile,
    updateFile,
    cleared,
    recordResult,
    clear,
    code: files[activeFile] ?? "",
    setCode,
  };
}

function sameRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) {return false;}
  for (const k of ak) {
    if (a[k] !== b[k]) {return false;}
  }
  return true;
}
