import { describe, expect, it } from "vitest";

import { ApiError, type Caller, type ProfileRole } from "./authz.js";
import {
  canParseSkillSheet,
  canSaveSkillSheet,
  canViewSkillSheet,
  requireCanParseSkillSheet,
  requireCanSaveSkillSheet,
} from "./skill-sheet-authz.js";

const caller = (role: ProfileRole, overrides: Partial<Caller> = {}): Caller => ({
  id: "u1",
  tenantId: "ses",
  role,
  name: "Tester",
  email: null,
  ...overrides,
});

describe("canParseSkillSheet", () => {
  const allowed: ProfileRole[] = ["student", "sales", "admin", "platform_admin"];

  it.each(allowed)("allows %s to parse", (role) => {
    expect(canParseSkillSheet(role)).toBe(true);
    expect(() => requireCanParseSkillSheet(caller(role))).not.toThrow();
  });

  it("rejects instructor with 403", () => {
    expect(canParseSkillSheet("instructor")).toBe(false);
    expect(() => requireCanParseSkillSheet(caller("instructor"))).toThrow(ApiError);
    try {
      requireCanParseSkillSheet(caller("instructor"));
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(403);
    }
  });
});

describe("canSaveSkillSheet", () => {
  const allowed: ProfileRole[] = ["student", "sales", "admin", "platform_admin"];

  it.each(allowed)("allows %s to save", (role) => {
    expect(canSaveSkillSheet(role)).toBe(true);
    expect(() => requireCanSaveSkillSheet(caller(role))).not.toThrow();
  });

  it("rejects instructor with 403", () => {
    expect(canSaveSkillSheet("instructor")).toBe(false);
    expect(() => requireCanSaveSkillSheet(caller("instructor"))).toThrow(ApiError);
  });
});

describe("canViewSkillSheet", () => {
  it("allows student to view own sheet", () => {
    expect(
      canViewSkillSheet(caller("student", { id: "seed-learner" }), "seed-learner", "ses"),
    ).toBe(true);
  });

  it("rejects student viewing another profile sheet", () => {
    expect(canViewSkillSheet(caller("student", { id: "seed-learner" }), "other-user", "ses")).toBe(
      false,
    );
  });

  const staffViewers: ProfileRole[] = ["sales", "admin", "platform_admin", "instructor"];

  it.each(staffViewers)("allows %s to view any profile in tenant", (role) => {
    expect(canViewSkillSheet(caller(role), "seed-learner", "ses")).toBe(true);
  });

  it("rejects cross-tenant view", () => {
    expect(
      canViewSkillSheet(caller("admin", { tenantId: "ses" }), "seed-learner", "other-tenant"),
    ).toBe(false);
    expect(
      canViewSkillSheet(
        caller("student", { id: "seed-learner", tenantId: "ses" }),
        "seed-learner",
        "other-tenant",
      ),
    ).toBe(false);
  });
});
