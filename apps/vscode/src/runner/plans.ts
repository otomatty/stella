/**
 * runnerId から、実行する手順の並びを決める。手順の中身は steps.ts が固定で持つ。
 */

import type { TaskManifest } from "@stella/shared/tasks/manifest";
import { RUNNERS } from "@stella/shared/tasks/runners";
import {
  browsersStep,
  ciStep,
  depsStep,
  diagnoseStep,
  formatStep,
  lintStep,
  nextBuildStep,
  playwrightStep,
  type StepDefinition,
  staticStep,
  vitestStep,
} from "./steps.js";

export function buildPlan(manifest: TaskManifest): StepDefinition[] {
  const checks: StepDefinition[] = [];
  if (manifest.checks.lint) checks.push(lintStep);
  if (manifest.checks.format) checks.push(formatStep);
  switch (RUNNERS[manifest.runner].plan) {
    case "static":
      return [staticStep];
    case "diagnose":
      return [diagnoseStep];
    case "vitest":
      return [depsStep, ...checks, vitestStep];
    case "playwright":
      return [depsStep, browsersStep, ...checks, playwrightStep];
    case "next":
      return [depsStep, browsersStep, ...checks, nextBuildStep, playwrightStep];
    case "ci":
      return [ciStep];
  }
}
