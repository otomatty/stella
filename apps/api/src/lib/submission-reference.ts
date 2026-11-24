import type { SubmissionReference } from "@stella/shared/review/types";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { submissions, taskPrivate, taskPrivateVersions } from "../db/schema.js";

const SOLUTION_PREFIX = "solution/";

function decodeText(base64: string): string | null {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
  const text = new TextDecoder().decode(bytes);
  return text.includes("\u0000") || text.includes("\uFFFD") ? null : text;
}

function formatReference(
  filesJson: string,
  version: "submitted" | "latest",
  submittedAt: Date,
): SubmissionReference {
  const privateFiles = JSON.parse(filesJson) as Record<string, string>;
  const files = Object.keys(privateFiles)
    .filter((path) => path.startsWith(SOLUTION_PREFIX) && path.length > SOLUTION_PREFIX.length)
    .sort()
    .flatMap((path) => {
      const text = decodeText(privateFiles[path]);
      return text === null ? [] : [{ path: path.slice(SOLUTION_PREFIX.length), text }];
    });
  return {
    available: true,
    submittedAt: submittedAt.getTime(),
    version,
    ...(version === "latest"
      ? { note: "提出時のバージョンが分からないため、今のバージョンの解答例を表示しています" }
      : {}),
    files,
    reviewGuide: decodeText(privateFiles["review.md"] ?? "") ?? "",
  };
}

/** 提出が無い場合は null を返す。 */
export async function loadSubmissionReference(
  db: Db,
  id: string,
): Promise<SubmissionReference | null> {
  const [submission] = await db
    .select({
      taskId: submissions.taskId,
      taskPrivateHash: submissions.taskPrivateHash,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!submission) return null;
  const { taskId, taskPrivateHash, submittedAt } = submission;
  if (!taskId) return { available: false, reason: "旧形式の提出には参考の書き方がありません" };

  if (taskPrivateHash) {
    const [submitted] = await db
      .select({ files: taskPrivateVersions.files })
      .from(taskPrivateVersions)
      .where(
        and(
          eq(taskPrivateVersions.taskId, taskId),
          eq(taskPrivateVersions.privateHash, taskPrivateHash),
        ),
      )
      .limit(1);
    if (submitted) return formatReference(submitted.files, "submitted", submittedAt);
  }

  const [latest] = await db
    .select({ files: taskPrivate.files })
    .from(taskPrivate)
    .where(eq(taskPrivate.taskId, taskId))
    .limit(1);
  return latest
    ? formatReference(latest.files, "latest", submittedAt)
    : { available: false, reason: "この課題の解答例が見つかりません" };
}
