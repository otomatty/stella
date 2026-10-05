import { lstat, mkdir, mkdtemp, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsePublicTaskBundle, type TaskBundle } from "@stella/shared/tasks/catalog";
import { isSafeRelativePattern, parseTaskManifest } from "@stella/shared/tasks/manifest";
import { isFileInRoot, readFileInRoot } from "./runner/files.js";

async function info(file: string) {
  try {
    return await lstat(file);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && err.code === "ENOENT") return null;
    throw err;
  }
}
async function directory(dir: string): Promise<void> {
  const parent = path.dirname(dir);
  if (parent !== dir) await directory(parent);
  const stat = await info(dir);
  if (!stat) await mkdir(dir);
  else if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error(`配布先に通常のフォルダーが必要です: ${dir}`);
}

/** 配布を一時フォルダーで完成させてから配置する。学習者のファイルは上書きしない。 */
export async function installTask(trainingRoot: string, bundle: TaskBundle): Promise<string> {
  bundle = parsePublicTaskBundle(bundle);
  const parsed = parseTaskManifest(bundle.manifest);
  if (!parsed.ok || bundle.manifest.id.split("/").length !== 3)
    throw new Error("配布する課題の定義が不正です");
  const paths = Object.keys(bundle.files);
  for (const rel of paths) {
    if (
      !isSafeRelativePattern(rel) ||
      /[*?{}[\]]/.test(rel) ||
      rel.split("/").some((s) => ["private", "solution", "variants"].includes(s)) ||
      rel === ".stella/distribution.json"
    )
      throw new Error(`配布ファイルのパスが不正です: ${rel}`);
  }
  const root = path.join(trainingRoot, ...bundle.manifest.id.split("/"));
  const parent = path.dirname(root);
  await directory(parent);
  const rootInfo = await info(root);
  if (rootInfo && (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()))
    throw new Error(`配布先に通常のフォルダーが必要です: ${root}`);
  const stateInfo = await info(path.join(root, ".stella"));
  if (stateInfo && (!stateInfo.isDirectory() || stateInfo.isSymbolicLink()))
    throw new Error(`配布先に通常のフォルダーが必要です: ${path.join(root, ".stella")}`);
  const receipt = path.join(root, ".stella", "distribution.json");
  const receiptInfo = await info(receipt);
  if (receiptInfo?.isSymbolicLink()) throw new Error("配布記録にシンボリックリンクは使えません");
  if (receiptInfo?.isFile()) {
    const previous = JSON.parse(
      (await readFileInRoot(root, ".stella/distribution.json", 4096)).toString("utf8"),
    ) as {
      taskId: string;
      contentHash: string;
    };
    if (previous.taskId === bundle.manifest.id && previous.contentHash === bundle.contentHash) {
      for (const rel of paths) {
        if (!(await isFileInRoot(root, rel)))
          throw new Error(
            `配布ファイルが不足しているか不正です (${rel})。学習中のファイルを退避してから課題フォルダーを移動し、開き直してください: ${root}`,
          );
      }
      return root;
    }
    throw new Error(
      `教材が更新されています。学習中のファイルを退避してから開き直してください: ${root}`,
    );
  }
  if (rootInfo && (await readdir(root)).length > 0)
    throw new Error(
      `配布先のファイルと衝突しています。保存済みの課題フォルダーを退避してください: ${root}`,
    );
  // 同じ親の下で組み立て、完成したディレクトリだけを rename で公開する。
  // 終了や書き込み失敗で一時ファイルが残っても、次回の配布先とは衝突しない。
  const staging = await mkdtemp(path.join(parent, ".stella-task-"));
  try {
    for (const rel of paths) {
      await directory(path.dirname(path.join(staging, rel)));
      await writeFile(path.join(staging, rel), Buffer.from(bundle.files[rel], "base64"), {
        flag: "wx",
      });
    }
    await directory(path.join(staging, ".stella"));
    await writeFile(
      path.join(staging, ".stella/distribution.json"),
      JSON.stringify({ taskId: bundle.manifest.id, contentHash: bundle.contentHash }),
      { flag: "wx" },
    );
    // Windows でも rename できるよう空の既存フォルダーだけを除く。
    // 配布中にファイルが追加された場合は rmdir が失敗し、そのファイルを保持する。
    if (rootInfo) await rmdir(root);
    await rename(staging, root);
    return root;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
