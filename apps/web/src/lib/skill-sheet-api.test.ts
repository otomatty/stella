/**
 * Issue #233 — skill sheet web API client tests (#203 contracts).
 * Expected production module: ./skill-sheet-api.js
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SKILL_SHEET_PARSE_PATH,
  SKILL_SHEET_SAVE_PATH,
  SKILL_SHEET_V1_SECTION_KEYS,
  TEST_SERVER_URL,
  createPdfFile,
  createXlsxFile,
  minimalSkillSheetV1,
  sampleParseDraft,
  skillSheetViewPath,
} from "./skill-sheet-api.test-helpers.js";

type SkillSheetApiModule = typeof import("./skill-sheet-api.js");

async function loadSkillSheetApi(): Promise<SkillSheetApiModule | null> {
  try {
    return await import("./skill-sheet-api.js");
  } catch {
    return null;
  }
}

describe("skill-sheet-api module (#233)", () => {
  it("exports parseSkillSheet, saveSkillSheet, and fetchSkillSheet", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();
    expect(typeof mod?.parseSkillSheet).toBe("function");
    expect(typeof mod?.saveSkillSheet).toBe("function");
    expect(typeof mod?.fetchSkillSheet).toBe("function");
  });
});

describe("POST /api/skill-sheets/parse client (#233 acceptance 1, 5)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SERVER_URL", TEST_SERVER_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("parseSkillSheet sends multipart PDF to POST /api/skill-sheets/parse", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const draft = sampleParseDraft();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(draft), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "test-token",
    }));

    const result = await mod?.parseSkillSheet(createPdfFile());
    expect(result?.status).toBe("DRAFT");
    expect(result?.sections).toBeDefined();
    for (const key of SKILL_SHEET_V1_SECTION_KEYS) {
      expect(result?.sections).toHaveProperty(key);
    }

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${TEST_SERVER_URL}${SKILL_SHEET_PARSE_PATH}`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
  });

  it("parseSkillSheet accepts xlsx uploads", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(sampleParseDraft()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "test-token",
    }));

    await mod?.parseSkillSheet(createXlsxFile());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const file = (init.body as FormData).get("file") as File;
    expect(file.name).toMatch(/\.xlsx$/i);
  });

  it("parseSkillSheet surfaces server parse errors for manual-entry fallback (#233 acceptance 5)", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "解析に失敗しました" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "test-token",
    }));

    await expect(mod?.parseSkillSheet(createPdfFile())).rejects.toThrow(/解析|503|失敗/i);
  });
});

describe("PUT/POST /api/skill-sheets client (#233 acceptance 1, 2, 5, 6)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SERVER_URL", TEST_SERVER_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("saveSkillSheet PUTs SkillSheetV1 with profileId to /api/skill-sheets", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const sheet = minimalSkillSheetV1();
    sheet.sections.self_pr = "手入力で登録";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "sheet-1", rowCount: 1 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "test-token",
    }));

    const saved = await mod?.saveSkillSheet("seed-learner", sheet);
    expect(saved?.id).toBe("sheet-1");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${TEST_SERVER_URL}${SKILL_SHEET_SAVE_PATH}`);
    expect(init.method).toBe("PUT");
    const body = JSON.parse(String(init.body)) as {
      profileId: string;
      sheet: typeof sheet;
      r2Key?: string;
    };
    expect(body.profileId).toBe("seed-learner");
    expect(body.sheet.sections.self_pr).toBe("手入力で登録");
  });

  it("saveSkillSheet forwards parse r2Key when saving a parsed draft", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "sheet-2", rowCount: 1 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "test-token",
    }));

    const draft = sampleParseDraft();
    await mod?.saveSkillSheet("seed-learner", { sections: draft.sections }, draft.r2Key);

    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      r2Key?: string;
    };
    expect(body.r2Key).toBe(draft.r2Key);
  });

  it("saveSkillSheet allows proxy registration for another learner (sales/admin monitoring)", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "sheet-proxy", rowCount: 1 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "sales-token",
    }));

    await mod?.saveSkillSheet("seed-learner", minimalSkillSheetV1());

    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      profileId: string;
    };
    expect(body.profileId).toBe("seed-learner");
  });

  it("saveSkillSheet succeeds with empty v1 form after parse failure (manual entry)", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "sheet-manual", rowCount: 1 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "test-token",
    }));

    const empty = minimalSkillSheetV1();
    const saved = await mod?.saveSkillSheet("seed-learner", empty);
    expect(saved?.id).toBeDefined();
    expect(empty.sections.self_pr).toBe("");
  });
});

describe("GET /api/skill-sheets/:profileId client (#233 acceptance 4)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SERVER_URL", TEST_SERVER_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("fetchSkillSheet GETs saved sections for a profile", async () => {
    const mod = await loadSkillSheetApi();
    expect(mod, "skill-sheet-api.js must exist for #233").not.toBeNull();

    const sheet = minimalSkillSheetV1();
    sheet.sections.self_pr = "保存済み";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "sheet-view", sections: sheet.sections }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./auth-client.js", () => ({
      getAccessToken: () => "test-token",
    }));

    const viewed = await mod?.fetchSkillSheet("seed-learner");
    expect(viewed?.sections.self_pr).toBe("保存済み");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${TEST_SERVER_URL}${skillSheetViewPath("seed-learner")}`);
    expect(init.method).toBe("GET");
  });
});
