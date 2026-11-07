/**
 * 類題のテンプレート (`private/variant-templates/`) から類題 (`private/variants/<名前>/`) を書き出す (#69)。
 *
 *   bun run --filter=@stella/content variants:generate                 # 全ステージ
 *   bun run --filter=@stella/content variants:generate -- dev-env-basics/u02-first-task
 *   bun run --filter=@stella/content variants:generate -- --check      # 書かずに食い違いを確かめる (content:check)
 *
 * 引数は `<ステージ>` か `<ステージ>/<単元>` (課題の task.json の id の先頭)。生成した類題を手で直すと
 * `--check` が落ちるので、テンプレートかパラメータを直して作り直す。書き方は ADDING_STAGE.md。
 */
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { syncVariantTemplates } from "../src/variant-templates.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stagesRoot = join(root, "stages");
const args = process.argv.slice(2);
const check = args.includes("--check");
const targets = args.filter((arg) => arg !== "--check");
const filter =
  targets.length === 0
    ? undefined
    : (taskDir: string) => {
        const { id } = JSON.parse(readFileSync(join(taskDir, "task.json"), "utf8")) as {
          id: string;
        };
        return targets.some((target) => id === target || id.startsWith(`${target}/`));
      };
const { changed, total } = syncVariantTemplates(stagesRoot, {
  check,
  ...(filter ? { filter } : {}),
});
const list = changed.map((path) => `  ${relative(root, path)}`).join("\n");
if (check && changed.length > 0) {
  console.error(
    `テンプレートから作り直した結果と食い違う類題があります。テンプレートかパラメータを直して作り直してください (bun run --filter=@stella/content variants:generate):\n${list}`,
  );
  process.exit(1);
}
console.log(
  check
    ? `類題のテンプレート: ${total} 問がテンプレートと一致`
    : `類題のテンプレート: ${total} 問のうち ${changed.length} 問を書き出しました${list ? `\n${list}` : ""}`,
);
