/**
 * Issue #205 — interview scheduled date test contracts and in-memory DB mock.
 * Expected production module: routes/interview-prep.ts
 */

import { SignJWT } from "jose";

import type { ProfileRole } from "../lib/authz.js";
import type { Env } from "../env.js";

export const INTERVIEW_PREP_ASSIGNMENTS_PATH = "/api/interview-prep/assignments";
export const INTERVIEW_PREP_QUESTIONS_PATH = "/api/interview-prep/questions";
export const interviewPrepAssignmentPath = (profileId: string) =>
  `${INTERVIEW_PREP_ASSIGNMENTS_PATH}/${encodeURIComponent(profileId)}`;

export const TEST_JWT_SECRET = "interview-prep-test-secret";

export const SEED_PROFILES = {
  learner: { id: "seed-learner", tenantId: "ses", role: "student" as ProfileRole },
  learnerB: { id: "seed-learner-b", tenantId: "ses", role: "student" as ProfileRole },
  learnerC: { id: "seed-learner-c", tenantId: "ses", role: "student" as ProfileRole },
  learnerD: { id: "seed-learner-d", tenantId: "ses", role: "student" as ProfileRole },
  instructor: { id: "seed-instructor", tenantId: "ses", role: "instructor" as ProfileRole },
  admin: { id: "seed-admin", tenantId: "ses", role: "admin" as ProfileRole },
  sales: { id: "seed-sales", tenantId: "ses", role: "sales" as ProfileRole },
  platformAdmin: {
    id: "seed-platform-admin",
    tenantId: "ses",
    role: "platform_admin" as ProfileRole,
  },
} as const;

export interface StudentProfile {
  id: string;
  tenantId: string;
  role: ProfileRole;
  displayName: string;
  email: string | null;
}

export interface InterviewPrepAssignmentRow {
  tenantId: string;
  profileId: string;
  categories: string[];
  interviewDate: string | null;
  interviewNote: string | null;
  assignedBy: string | null;
}

export interface InterviewPrepTestState {
  assignments: Map<string, InterviewPrepAssignmentRow>;
  notifications: Array<Record<string, unknown>>;
}

export const TEST_STUDENTS: StudentProfile[] = [
  {
    id: SEED_PROFILES.learner.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner A",
    email: "learner-a@example.local",
  },
  {
    id: SEED_PROFILES.learnerB.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner B",
    email: "learner-b@example.local",
  },
  {
    id: SEED_PROFILES.learnerC.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner C",
    email: "learner-c@example.local",
  },
  {
    id: SEED_PROFILES.learnerD.id,
    tenantId: "ses",
    role: "student",
    displayName: "Learner D",
    email: "learner-d@example.local",
  },
];

const DRIZZLE_NAME = Symbol.for("drizzle:Name");

function tableName(table: object): string {
  return (table as Record<symbol, string>)[DRIZZLE_NAME];
}

function assignmentKey(tenantId: string, profileId: string): string {
  return `${tenantId}:${profileId}`;
}

function selectShapeKeys(shape: Record<string, unknown>): string[] {
  return Object.keys(shape);
}

export function createInterviewPrepTestState(): InterviewPrepTestState {
  return {
    assignments: new Map(),
    notifications: [],
  };
}

interface DbContext {
  callerId: string;
  callerTenantId: string;
  targetProfileId?: string;
}

function resolveAssignment(
  state: InterviewPrepTestState,
  tenantId: string,
  profileId: string,
): InterviewPrepAssignmentRow | undefined {
  return state.assignments.get(assignmentKey(tenantId, profileId));
}

function assignmentPayload(row: InterviewPrepAssignmentRow, includeDateFields: boolean) {
  const base = {
    profile_id: row.profileId,
    categories: row.categories,
  };
  if (!includeDateFields) return base;
  return {
    ...base,
    interviewDate: row.interviewDate,
    note: row.interviewNote,
    interview_date: row.interviewDate,
    interview_note: row.interviewNote,
  };
}

export function createInterviewPrepTestDb(
  state: InterviewPrepTestState,
  ctx: DbContext,
): Record<string, unknown> {
  const executeSelect = async (
    fromTable: string,
    shape: Record<string, unknown>,
    limit?: number,
  ): Promise<unknown[]> => {
    const keys = selectShapeKeys(shape);

    if (fromTable === "profiles") {
      if (keys.includes("id") && keys.includes("tenantId") && keys.includes("role")) {
        const profileId = ctx.targetProfileId ?? ctx.callerId;
        const found = TEST_STUDENTS.find((s) => s.id === profileId);
        if (!found) return [];
        return [{ id: found.id, tenantId: found.tenantId, role: found.role }];
      }
      if (keys.includes("profile_id") && keys.includes("display_name")) {
        const rows = TEST_STUDENTS.filter((s) => s.tenantId === ctx.callerTenantId).map((s) => ({
          profile_id: s.id,
          display_name: s.displayName,
          email: s.email,
        }));
        return limit ? rows.slice(0, limit) : rows;
      }
    }

    if (fromTable === "interview_prep_assignments") {
      if (keys.length === 1 && keys[0] === "categories") {
        const row = resolveAssignment(state, ctx.callerTenantId, ctx.callerId);
        if (!row) return [];
        return [{ categories: row.categories }];
      }
      const includeDate = keys.includes("interviewDate") || keys.includes("interview_date");
      const rows = [...state.assignments.values()]
        .filter((a) => a.tenantId === ctx.callerTenantId)
        .map((a) => assignmentPayload(a, includeDate || keys.includes("note")));
      return limit ? rows.slice(0, limit) : rows;
    }

    if (fromTable === "interview_questions") {
      return [
        {
          no: 1,
          categories: ["PHP"],
          question: "test?",
          freq: "A",
          subcategory: "",
          time: 30,
          keywords: "",
          intent: "",
          answer_template: "",
          deep1: "",
          deep2: "",
          deep3: "",
          ng: "",
          criteria: "",
          is_reverse: 0,
        },
      ];
    }

    return [];
  };

  const buildSelectChain = (shape: Record<string, unknown>) => {
    let fromTable = "";
    const chain: Record<string, unknown> = {};

    chain.from = (table: object) => {
      fromTable = tableName(table);
      return chain;
    };
    chain.where = () => chain;
    chain.orderBy = () => Promise.resolve(executeSelect(fromTable, shape));
    chain.limit = (n: number) => Promise.resolve(executeSelect(fromTable, shape, n));
    // biome-ignore lint/suspicious/noThenProperty: drizzle query chain is intentionally thenable in tests
    chain.then = (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => executeSelect(fromTable, shape).then(onFulfilled, onRejected);

    return chain;
  };

  return {
    select: (shape: Record<string, unknown>) => buildSelectChain(shape),
    insert: (table: object) => {
      const name = tableName(table);
      return {
        values: (data: Record<string, unknown> | Record<string, unknown>[]) => {
          const rows = Array.isArray(data) ? data : [data];
          if (name === "notifications") {
            for (const row of rows) state.notifications.push(row);
            return Promise.resolve(undefined);
          }
          if (name === "interview_prep_assignments") {
            return {
              onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => {
                for (const row of rows) {
                  const tenantId = row.tenantId as string;
                  const profileId = row.profileId as string;
                  const key = assignmentKey(tenantId, profileId);
                  const existing = state.assignments.get(key);
                  const merged: InterviewPrepAssignmentRow = {
                    tenantId,
                    profileId,
                    categories: (set.categories ??
                      row.categories ??
                      existing?.categories ??
                      []) as string[],
                    interviewDate: (set.interviewDate ??
                      row.interviewDate ??
                      existing?.interviewDate ??
                      null) as string | null,
                    interviewNote: (set.interviewNote ??
                      row.interviewNote ??
                      existing?.interviewNote ??
                      null) as string | null,
                    assignedBy: (set.assignedBy ??
                      row.assignedBy ??
                      existing?.assignedBy ??
                      null) as string | null,
                  };
                  state.assignments.set(key, merged);
                }
                return Promise.resolve(undefined);
              },
            };
          }
          return {
            onConflictDoUpdate: () => Promise.resolve(undefined),
          };
        },
      };
    },
  };
}

export async function mintInterviewPrepTestToken(userId: string): Promise<string> {
  return new SignJWT({ email: `${userId}@example.local` })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("falcon-api")
    .setAudience("falcon-web")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
}

export function createInterviewPrepTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    AUTH_JWT_SECRET: TEST_JWT_SECRET,
    ALLOWED_ORIGINS: "http://127.0.0.1:5173",
    DB: {} as D1Database,
    ...overrides,
  } as Env;
}

export const DEFAULT_CATEGORIES = ["PHP"] as const;

export function putAssignmentBody(
  overrides: { categories?: string[]; interviewDate?: string | null; note?: string | null } = {},
): Record<string, unknown> {
  return {
    categories: overrides.categories ?? [...DEFAULT_CATEGORIES],
    ...(overrides.interviewDate !== undefined ? { interviewDate: overrides.interviewDate } : {}),
    ...(overrides.note !== undefined ? { note: overrides.note } : {}),
  };
}
