import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { sql } from "@codemirror/lang-sql";
import { linter, lintGutter } from "@codemirror/lint";
import {
  EditorState as ReactEditorState,
  EditorView as ReactEditorView,
  getDefaultExtensions,
} from "@uiw/react-codemirror";

describe("CodeMirror dependency compatibility", () => {
  it("shares state and view constructors with the React wrapper", () => {
    expect(ReactEditorState).toBe(EditorState);
    expect(ReactEditorView).toBe(EditorView);
  });

  // Duplicate state packages can pass typechecking but reject extensions at runtime.
  describe.each(["light", "dark"] as const)("%s theme", (theme) => {
    it.each(["javascript", "typescript", "sql"])("composes %s editor extensions", (language) => {
      const languageExtension =
        language === "sql" ? sql() : javascript({ typescript: language === "typescript" });
      const state = EditorState.create({
        doc: "example",
        extensions: [
          getDefaultExtensions({ theme }),
          languageExtension,
          ...(language === "javascript" ? [linter(() => []), lintGutter()] : []),
          EditorView.editable.of(true),
        ],
      });

      expect(
        state.update({ changes: { from: 0, to: 7, insert: "edited" } }).state.doc.toString(),
      ).toBe("edited");
    });
  });
});
