import { beforeEach, describe, expect, it, vi } from "vitest";
import { migrateExerciseDirectory } from "./exercise-directory.js";

const state = vi.hoisted(() => ({
  existing: new Set<string>(),
  stat: vi.fn(),
  copy: vi.fn(),
  rename: vi.fn(),
  delete: vi.fn(),
  createDirectory: vi.fn(),
  documents: [] as { uri: { fsPath: string }; isDirty: boolean; save: () => Promise<boolean> }[],
}));
vi.mock("vscode", () => ({
  FileSystemError: class extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
  Uri: {
    joinPath: (uri: { fsPath: string }, ...parts: string[]) => ({
      fsPath: parts.reduce(
        (current, part) =>
          part === ".." ? current.slice(0, current.lastIndexOf("/")) : `${current}/${part}`,
        uri.fsPath,
      ),
    }),
  },
  workspace: {
    fs: {
      stat: state.stat,
      copy: state.copy,
      rename: state.rename,
      delete: state.delete,
      createDirectory: state.createDirectory,
    },
    get textDocuments() {
      return state.documents;
    },
  },
}));
import { FileSystemError, type Uri } from "vscode";

const root = { fsPath: "/home/u/.stella/exercises/asg-1" } as Uri;
const legacy = { fsPath: "/home/u/.falcon-informal/exercises/asg-1" } as Uri;

beforeEach(() => {
  vi.resetAllMocks();
  state.existing.clear();
  state.documents = [];
  state.stat.mockImplementation(async (uri: Uri) => {
    if (!state.existing.has(uri.fsPath)) throw new FileSystemError("FileNotFound");
  });
});

describe("existing exercise migration", () => {
  it("saves dirty legacy code before copying without overwrite", async () => {
    state.existing.add(legacy.fsPath);
    const events: string[] = [];
    state.documents.push({
      uri: { fsPath: legacy.fsPath + "/main.js" },
      isDirty: true,
      save: async () => {
        events.push("save");
        return true;
      },
    });
    state.copy.mockImplementation(async () => {
      events.push("copy");
    });
    await migrateExerciseDirectory(root, legacy);
    expect(events).toEqual(["save", "copy"]);
    const staging = state.copy.mock.calls[0]?.[1] as Uri;
    expect(staging.fsPath).not.toBe(root.fsPath);
    expect(state.rename).toHaveBeenCalledWith(staging, root, { overwrite: false });
  });

  it("removes a partial copy when the move into place fails", async () => {
    state.existing.add(legacy.fsPath);
    state.copy.mockImplementation(async (_from: Uri, staging: Uri) => {
      state.existing.add(staging.fsPath);
    });
    state.rename.mockRejectedValue(new Error("exists"));
    await expect(migrateExerciseDirectory(root, legacy)).rejects.toThrow("exists");
    const staging = state.copy.mock.calls[0]?.[1] as Uri;
    expect(state.delete).toHaveBeenCalledWith(staging, { recursive: true });
    expect(state.existing.has(root.fsPath)).toBe(false);
  });

  it("leaves a previously migrated exercise untouched", async () => {
    state.existing.add(root.fsPath);
    state.existing.add(legacy.fsPath);
    await migrateExerciseDirectory(root, legacy);
    expect(state.copy).not.toHaveBeenCalled();
  });

  it("does not copy stale code when saving is cancelled", async () => {
    state.existing.add(legacy.fsPath);
    state.documents.push({
      uri: { fsPath: legacy.fsPath + "/main.js" },
      isDirty: true,
      save: async () => false,
    });
    await expect(migrateExerciseDirectory(root, legacy)).rejects.toThrow(
      "旧演習ファイルを保存できませんでした",
    );
    expect(state.copy).not.toHaveBeenCalled();
  });

  it("does not treat a permission error as a missing exercise", async () => {
    state.stat.mockRejectedValue(new FileSystemError("NoPermissions"));
    await expect(migrateExerciseDirectory(root, legacy)).rejects.toThrow("NoPermissions");
    expect(state.copy).not.toHaveBeenCalled();
  });
});
