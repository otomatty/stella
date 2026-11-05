import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("./api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { deleteUser } = await import("./admin-users-api");

beforeEach(() => apiFetch.mockReset());

describe("deleteUser", () => {
  it("POST /api/admin/users/delete に userId と confirmEmail を送り、deleted を返す", async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      deleted: { submissions: 2, library_books: 1 },
    });

    await expect(deleteUser("user-1", "Learner@Example.com")).resolves.toEqual({
      submissions: 2,
      library_books: 1,
    });
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/users/delete", {
      method: "POST",
      body: { userId: "user-1", confirmEmail: "Learner@Example.com" },
    });
  });
});
