import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, rename, rm } from "node:fs/promises";
import path from "node:path";

/** 動画・字幕・ポスターを一式で保存し、置き換えに失敗したら元に戻す。 */
export async function saveRecording(outDir: string, id: string, topicDir: string): Promise<void> {
  const suffix = randomUUID();
  const files = ["mp4", "vtt", "jpg"].map((ext) => {
    const target = path.join(topicDir, `screen.${ext}`);
    return {
      source: path.join(outDir, `${id}.${ext}`),
      target,
      temporary: `${target}.${suffix}.tmp`,
      backup: `${target}.${suffix}.bak`,
      hadPrevious: false,
      replaced: false,
    };
  });
  const errors: unknown[] = [];
  let saved = false;
  try {
    for (const file of files) {
      await copyFile(file.source, file.temporary, constants.COPYFILE_EXCL);
    }
    for (const file of files) {
      try {
        await copyFile(file.target, file.backup, constants.COPYFILE_EXCL);
        file.hadPrevious = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    for (const file of files) {
      await rename(file.temporary, file.target);
      file.replaced = true;
    }
    saved = true;
  } catch (error) {
    errors.push(error);
    for (const file of files) {
      if (!file.replaced) continue;
      try {
        if (file.hadPrevious) await rename(file.backup, file.target);
        else await rm(file.target, { force: true });
        file.replaced = false;
      } catch (restoreError) {
        errors.push(
          new Error(
            `復元できませんでした: ${file.target}${file.hadPrevious ? ` (退避先: ${file.backup})` : ""}`,
            { cause: restoreError },
          ),
        );
      }
    }
  } finally {
    for (const file of files) {
      // 復元自体に失敗した場合だけ、唯一の旧データである退避を残す。
      const cleanup = saved || !file.replaced ? [file.temporary, file.backup] : [file.temporary];
      for (const temporary of cleanup) {
        try {
          await rm(temporary, { force: true });
        } catch (cleanupError) {
          errors.push(
            new Error(`一時ファイルを削除できませんでした: ${temporary}`, { cause: cleanupError }),
          );
        }
      }
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      errors.map((error) => (error instanceof Error ? error.message : String(error))).join("\n"),
    );
  }
}
