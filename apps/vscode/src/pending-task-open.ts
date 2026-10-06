/**
 * 学習フォルダーを開く前に控える「開く課題」(#31)。
 *
 * 学習フォルダーを開くと、ウィンドウが読み込み直される (拡張も起動し直す) か、学習フォルダーを
 * すでに開いている別のウィンドウへ切り替わる。どちらでも課題文を開けるよう、拡張の保存領域
 * (globalStorageUri。同じ端末の全ウィンドウで共有) にファイルで控える。
 *
 * globalState は使わない。別のウィンドウへの反映は非同期で (書き込みはまとめて送られる)、
 * 切り替わった直後のウィンドウが読んだときにまだ見えないことがありうるため。ファイルなら
 * `vscode.openFolder` を呼ぶ前に書き終わり、どのウィンドウからもすぐ読める。
 * 受け取りは rename (アトミック) で 1 つのウィンドウに限る。まれな競合で誰も開かないことは
 * あっても、2 つのウィンドウが両方開くことはない (課題はもう準備できている)。
 */

import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = "pending-task-open.json";
/** 控えの有効期間。過ぎた控えは捨てる (後で同じフォルダーを開いても勝手に開かない)。 */
export const PENDING_TTL_MS = 10 * 60 * 1000;

export interface PendingTaskOpen {
  id: string;
  trainingRoot: string;
  taskRoot: string;
  at: number;
}

function isInside(dir: string, target: string): boolean {
  const rel = path.relative(dir, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function errorCode(error: unknown): unknown {
  return typeof error === "object" && error && "code" in error ? error.code : undefined;
}

export function readPendingTaskOpen(value: unknown, now = Date.now()): PendingTaskOpen | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { id, trainingRoot, taskRoot, at } = value as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    !id ||
    typeof trainingRoot !== "string" ||
    typeof taskRoot !== "string" ||
    typeof at !== "number" ||
    !path.isAbsolute(trainingRoot) ||
    !isInside(trainingRoot, taskRoot) ||
    now - at > PENDING_TTL_MS ||
    at > now + 60_000
  )
    return undefined;
  return { id, trainingRoot, taskRoot, at };
}

async function readPendingFile(file: string, now: number): Promise<PendingTaskOpen | undefined> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    throw error;
  }
  try {
    return readPendingTaskOpen(JSON.parse(text), now);
  } catch {
    return undefined;
  }
}

/** 開く課題を控える。前の控えは新しい控えで置き換える (最後に押した課題を開く)。 */
export async function savePendingTaskOpen(
  dir: string,
  target: { trainingRoot: string; taskRoot: string },
  now = Date.now(),
): Promise<PendingTaskOpen> {
  await mkdir(dir, { recursive: true });
  const pending: PendingTaskOpen = { id: randomUUID(), ...target, at: now };
  const temp = path.join(dir, `${FILE}.${pending.id}.tmp`);
  await writeFile(temp, JSON.stringify(pending), { flag: "wx" });
  try {
    await rename(temp, path.join(dir, FILE));
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
  return pending;
}

/**
 * このウィンドウ向け (accepts) の控えなら受け取って消す。別のウィンドウ向けなら残す。
 * 期限切れ・壊れた控えは捨てる。
 */
export async function takePendingTaskOpen(
  dir: string,
  accepts: (pending: PendingTaskOpen) => boolean,
  now = Date.now(),
): Promise<PendingTaskOpen | undefined> {
  const file = path.join(dir, FILE);
  const seen = await readPendingFile(file, now);
  if (seen && !accepts(seen)) return undefined;
  // 受け取る (または捨てる) ときは、まず自分だけの名前へ付け替える。付け替えに成功した
  // ウィンドウだけが中身を扱う。
  const claimed = path.join(dir, `${FILE}.${randomUUID()}.claimed`);
  try {
    await rename(file, claimed);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    throw error;
  }
  try {
    const taken = await readPendingFile(claimed, now);
    if (!taken) return undefined;
    if (accepts(taken)) return taken;
    // 読んでから付け替えるまでに、別のウィンドウ向けの新しい控えが置かれていた。元へ戻す。
    // さらに新しい控えが置かれていれば、そちらを優先する (link は既存を上書きしない)。
    await link(claimed, file).catch(() => undefined);
    return undefined;
  } finally {
    await rm(claimed, { force: true });
  }
}
