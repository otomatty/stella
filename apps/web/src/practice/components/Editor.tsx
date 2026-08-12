/**
 * CodeMirror 6 + ESLint プラグイン。
 * 編集中、ESLint の違反箇所が赤線/黄線でリアルタイム表示される。
 *
 * falcon-informal では JavaScript / TypeScript / SQL をサポート。
 */

import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";

import type { ESLintRuleConfig, Language } from "@falcon/shared/types";
import { useTheme } from "../hooks/useTheme.js";
import { getLinter } from "../lib/linters/index.js";

interface Props {
  code: string;
  onChange: (code: string) => void;
  eslintRules: Record<string, ESLintRuleConfig>;
  entryPoints: string[];
  /**
   * 現在表示中のファイルの言語。 省略時は "javascript" 扱い。
   * 非 JS (typescript / sql) のときは ESLint linter を無効化する。
   * typescript は `@codemirror/lang-javascript` の TS モードで、
   * sql は `@codemirror/lang-sql` を動的 import で取得して切り替える。
   */
  language?: Language;
  /** 編集を禁止する (readonly ファイル表示用)。 */
  readOnly?: boolean;
}

export function Editor({
  code,
  onChange,
  eslintRules,
  entryPoints,
  language = "javascript",
  readOnly = false,
}: Props) {
  const { theme } = useTheme();
  const eslintExtension = useMemo<Extension | null>(
    () => {
      if (language !== "javascript") {return null;}
      const runLint = getLinter(language);
      return linter((view) => {
        const text = view.state.doc.toString();
        const violations = runLint(text, eslintRules, {
          ignoredUnusedNames: entryPoints,
        });

        return violations
          .map((v): Diagnostic | null => {
            const line = view.state.doc.line(
              Math.min(Math.max(v.line, 1), view.state.doc.lines),
            );
            const from = Math.min(
              line.from + Math.max(0, v.column - 1),
              line.to,
            );
            const to = Math.min(from + 1, line.to);

            return {
              from,
              to,
              severity: v.severity === 2 ? "error" : "warning",
              message: v.message,
              source: v.ruleId ?? undefined,
            };
          })
          .filter((d): d is Diagnostic => d !== null);
      });
    },
    [entryPoints, eslintRules, language],
  );

  const [sqlExtension, setSqlExtension] = useState<Extension | null>(null);
  useEffect(() => {
    if (language !== "sql") {
      setSqlExtension(null);
      return;
    }
    let cancelled = false;
    void import("@codemirror/lang-sql").then((mod) => {
      if (!cancelled) {setSqlExtension(mod.sql());}
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const extensions = useMemo<Extension[]>(() => {
    const exts: Extension[] = [];
    if (language === "javascript" || language === "typescript") {
      exts.push(javascript({ typescript: language === "typescript" }));
    } else if (language === "sql" && sqlExtension) {
      exts.push(sqlExtension);
    }
    if (eslintExtension) {
      exts.push(eslintExtension, lintGutter());
    }
    return exts;
  }, [language, eslintExtension, sqlExtension]);

  return (
    <CodeMirror
      value={code}
      onChange={onChange}
      height="100%"
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        bracketMatching: true,
        autocompletion: true,
      }}
      extensions={extensions}
      theme={theme}
    />
  );
}
