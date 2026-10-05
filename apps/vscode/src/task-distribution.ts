import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsePublicTaskBundle, type TaskBundle } from "@stella/shared/tasks/catalog";
import { isSafeRelativePattern, parseTaskManifest } from "@stella/shared/tasks/manifest";

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

/** 学習フォルダーに配置する。既存の学習者のファイルは上書きしない。 */
export async function installTask(trainingRoot: string, bundle: TaskBundle): Promise<string> {
  bundle = parsePublicTaskBundle(bundle);
  const parsed = parseTaskManifest(bundle.manifest);
  if (!parsed.ok || bundle.manifest.id.split("/").length !== 3)
    throw new Error("配布する課題の定義が不正です");
  const root = path.join(trainingRoot, ...bundle.manifest.id.split("/"));
  await directory(root);
  await directory(path.join(root, ".stella"));
  const receipt = path.join(root, ".stella", "distribution.json");
  const receiptInfo = await info(receipt);
  if (receiptInfo?.isSymbolicLink()) throw new Error("配布記録にシンボリックリンクは使えません");
  if (receiptInfo?.isFile()) {
    const previous = JSON.parse(await readFile(receipt, "utf8")) as {
      taskId: string;
      contentHash: string;
    };
    if (previous.taskId === bundle.manifest.id && previous.contentHash === bundle.contentHash)
      return root;
    throw new Error(
      `教材が更新されています。学習中のファイルを退避してから開き直してください: ${root}`,
    );
  }
  const paths = Object.keys(bundle.files);
  for (const rel of paths) {
    if (
      !isSafeRelativePattern(rel) ||
      /[*?{}[\]]/.test(rel) ||
      rel.split("/").some((s) => ["private", "solution", "variants"].includes(s)) ||
      rel === ".stella/distribution.json"
    )
      throw new Error(`配布ファイルのパスが不正です: ${rel}`);
    // 親を先に確認し、学習者のリンクをたどって書き込ませない。
    await directory(path.dirname(path.join(root, rel)));
    if (await info(path.join(root, rel)))
      throw new Error(
        `配布先のファイルと衝突しています。保存済みのファイルを退避してください: ${path.join(root, rel)}`,
      );
  }
  for (const rel of paths)
    await writeFile(path.join(root, rel), Buffer.from(bundle.files[rel], "base64"), { flag: "wx" });
  await writeFile(
    receipt,
    JSON.stringify({ taskId: bundle.manifest.id, contentHash: bundle.contentHash }),
    { flag: "wx" },
  );
  return root;
}
