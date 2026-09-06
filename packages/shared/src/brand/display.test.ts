import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DISPLAY_COMMAND_PREFIX,
  DISPLAY_NAME,
  DISPLAY_SHORT_NAME,
  helpAboutHeading,
  supportMailSubjectPrefix,
} from "./display";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const readRepoFile = (relativePath: string): string =>
  readFileSync(join(repoRoot, relativePath), "utf8");

describe("display brand (Phase A)", () => {
  it("human-facing product name is STELLA", () => {
    expect(DISPLAY_NAME).toBe("STELLA");
    expect(DISPLAY_SHORT_NAME).toBe("STELLA");
    expect(DISPLAY_COMMAND_PREFIX).toBe("STELLA");
    expect(helpAboutHeading()).toBe("STELLA とは");
    expect(supportMailSubjectPrefix()).toBe("【STELLA】");
  });

  it("does not rename @falcon package scopes (Phase B)", () => {
    const webPkg = JSON.parse(readRepoFile("apps/web/package.json")) as { name: string };
    const sharedPkg = JSON.parse(readRepoFile("packages/shared/package.json")) as {
      name: string;
    };
    expect(webPkg.name).toBe("@falcon/web");
    expect(sharedPkg.name).toBe("@falcon/shared");
  });

  it("does not rename VS Code extension machine id (Phase B)", () => {
    const vscodePkg = JSON.parse(readRepoFile("apps/vscode/package.json")) as {
      name: string;
      contributes: { viewsContainers: { activitybar: { id: string }[] } };
    };
    expect(vscodePkg.name).toBe("informal");
    expect(vscodePkg.contributes.viewsContainers.activitybar[0]?.id).toBe("falcon");
  });

  it("does not rename localStorage auth token key (Phase B)", () => {
    const authClient = readRepoFile("apps/web/src/lib/auth-client.ts");
    expect(authClient).toContain('const TOKEN_KEY = "falcon_auth_token_v1"');
  });

  it("web index.html document title is STELLA", () => {
    const html = readRepoFile("apps/web/index.html");
    expect(html).toMatch(new RegExp(`<title>${DISPLAY_NAME}</title>`));
  });

  it("PWA manifest uses STELLA display names", () => {
    const manifest = JSON.parse(readRepoFile("apps/web/public/manifest.webmanifest")) as {
      name: string;
      short_name: string;
    };
    expect(manifest.name).toBe(DISPLAY_NAME);
    expect(manifest.short_name).toBe(DISPLAY_NAME);
  });

  it("help drawer about heading uses STELLA", () => {
    const helpContent = readRepoFile("apps/web/src/components/shell/helpContent.ts");
    expect(helpContent).toContain("helpAboutHeading()");
  });

  it("Brand default title uses STELLA constant", () => {
    const brandSource = readRepoFile("apps/web/src/components/common/Brand.tsx");
    expect(brandSource).toContain("title = DISPLAY_NAME");
  });

  it("support mail subject uses STELLA prefix helper", () => {
    const supportSource = readRepoFile("apps/web/src/components/public/SupportPage.tsx");
    expect(supportSource).toContain("supportMailSubjectPrefix()");
  });

  it("certificate demo issuer uses STELLA constant", () => {
    const certSource = readRepoFile("apps/web/src/components/learner/Certificate.tsx");
    expect(certSource).toContain("issuer={DISPLAY_NAME}");
  });

  it("BrandMark is a star glyph (not the legacy F path)", () => {
    const markSource = readRepoFile("apps/web/src/components/common/BrandMark.tsx");
    expect(markSource).not.toContain("M172 136 H340 V200");
    expect(markSource.toLowerCase()).toMatch(/star|星/);
  });

  it("theme tokens use night-sky palette (not Sports Force magenta accent)", () => {
    const css = readRepoFile("apps/web/src/index.css");
    expect(css).toMatch(/night.?sky|Night sky/i);
    expect(css).not.toMatch(/--brand:\s*#e62f9a/i);
  });

  it("VS Code user-visible strings use STELLA", () => {
    const vscodePkg = JSON.parse(readRepoFile("apps/vscode/package.json")) as {
      displayName: string;
      contributes: { viewsContainers: { activitybar: { title: string }[] } };
    };
    expect(vscodePkg.displayName).toBe(DISPLAY_NAME);
    expect(vscodePkg.contributes.viewsContainers.activitybar[0]?.title).toBe(DISPLAY_NAME);
  });
});
