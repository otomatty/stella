import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Locator } from "playwright/test";
import { signInAs } from "../e2e/support/auth";
import { test } from "../e2e/support/test";
import { getWebShot } from "./scenarios";

async function clipAround(target: Locator) {
  await target.waitFor();
  return target.evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
    const box = element.getBoundingClientRect();
    const x = Math.max(0, Math.floor(box.left - 24));
    const y = Math.max(0, Math.floor(box.top - 24));
    const right = Math.min(window.innerWidth, Math.ceil(box.right + 24));
    const bottom = Math.min(window.innerHeight, Math.ceil(box.bottom + 24));
    return { x, y, width: right - x, height: bottom - y };
  });
}

const names = new Set(
  process.env.RELEASE_SHOTS?.split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);
const shots = [...names].map((name) => ({ name, shot: getWebShot(name) }));
const out = process.env.RELEASE_SHOTS_OUT;
if (!shots.length || !out) throw new Error("RELEASE_SHOTS と RELEASE_SHOTS_OUT を設定してください");

for (const { name, shot } of shots) {
  test(name, async ({ page }) => {
    await signInAs(page, shot.profile);
    await page.goto(shot.path);
    await shot.ready(page);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const clip = shot.target ? await clipAround(shot.target(page)) : undefined;
    await shot.highlight?.(page).evaluate((element) => {
      const box = element.getBoundingClientRect();
      const nearEdge =
        box.left <= 8 ||
        box.top <= 8 ||
        window.innerWidth - box.right <= 8 ||
        window.innerHeight - box.bottom <= 8;
      element.style.outline = "3px solid #f59e0b";
      element.style.outlineOffset = nearEdge ? "-3px" : "4px";
    });
    await mkdir(out, { recursive: true });
    await page.screenshot({
      path: join(out, `${name}.png`),
      clip,
      animations: "disabled",
      caret: "hide",
    });
  });
}
