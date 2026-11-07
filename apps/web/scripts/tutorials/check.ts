import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { sourceHash } from "./lib/source-hash";
import type { Scenario } from "./lib/types";

interface RecordedTutorial {
  id: string;
  sourceHash?: string;
  narration?: boolean;
}
interface CurrentScenario {
  id: string;
  sourceHash: string;
  draft?: boolean;
}

/** I/O と分離した撮り直し判定。draft は公開対象に数えない。 */
export function staleTutorials(
  scenarios: CurrentScenario[],
  entries: RecordedTutorial[],
): string[] {
  return scenarios
    .filter((s) => !s.draft)
    .flatMap((s) => {
      const entry = entries.find((e) => e.id === s.id);
      if (!entry) return [`${s.id}（未収録）`];
      if (entry.sourceHash !== s.sourceHash) return [`${s.id}（画面かシナリオが変わっています）`];
      if (entry.narration !== true) return [`${s.id}（ナレーションなし）`];
      return [];
    });
}

async function main(): Promise<void> {
  const root = path.resolve(import.meta.dirname, "../..");
  let manifest: { tutorials: RecordedTutorial[] };
  try {
    manifest = JSON.parse(
      await readFile(path.join(root, "public/tutorials/manifest.json"), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.log("まだ収録した動画はありません");
    return;
  }
  if (!manifest.tutorials.length) {
    console.log("まだ収録した動画はありません");
    return;
  }
  const dir = path.join(root, "scripts/tutorials/scenarios");
  const scenarios: CurrentScenario[] = [];
  for (const name of (await readdir(dir)).filter((f) => /\.tsx?$/.test(f)).sort()) {
    const file = path.join(dir, name);
    const scenario = ((await import(pathToFileURL(file).href)) as { default: Scenario }).default;
    if (!scenario.draft) scenarios.push({ ...scenario, sourceHash: await sourceHash(root, file) });
  }
  const stale = staleTutorials(scenarios, manifest.tutorials);
  if (stale.length) {
    console.error(`撮り直しが必要な動画があります（bun run tutorials）:\n- ${stale.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`すべての動画（${scenarios.length}本）が最新の画面で収録されています。`);
}
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
