import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { errors as joseErrors } from "jose";
import {
  AccessAssertionError,
  AccessUnavailableError,
  accessConfig,
  identityFromAccessPayload,
  verifyAccessAssertion,
} from "./access-auth.js";
import {
  setupAccessFixture,
  TEST_ACCESS_AUD,
  TEST_TEAM_DOMAIN,
  type AccessFixture,
} from "../testing/access-fixture.js";

let fixture: AccessFixture;
beforeAll(async () => {
  fixture = await setupAccessFixture();
});
afterAll(() => fixture.restore());

describe("accessConfig", () => {
  it("両方そろったときだけ設定を返す", () => {
    expect(
      accessConfig({ ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN, ACCESS_AUD: TEST_ACCESS_AUD }),
    ).toEqual({
      issuer: `https://${TEST_TEAM_DOMAIN}`,
      certsUrl: `https://${TEST_TEAM_DOMAIN}/cdn-cgi/access/certs`,
      audiences: [TEST_ACCESS_AUD],
    });
    expect(accessConfig({ ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN })).toBeNull();
    expect(accessConfig({ ACCESS_AUD: TEST_ACCESS_AUD })).toBeNull();
    expect(accessConfig({})).toBeNull();
  });

  it("https:// と末尾のスラッシュを許し、パスや資格情報の混ざった値は受け付けない", () => {
    expect(
      accessConfig({ ACCESS_TEAM_DOMAIN: `https://${TEST_TEAM_DOMAIN}/`, ACCESS_AUD: "x, y" })
        ?.audiences,
    ).toEqual(["x", "y"]);
    for (const bad of [`${TEST_TEAM_DOMAIN}/path`, `user@${TEST_TEAM_DOMAIN}`, "localhost"]) {
      expect(accessConfig({ ACCESS_TEAM_DOMAIN: bad, ACCESS_AUD: TEST_ACCESS_AUD })).toBeNull();
    }
  });
});

describe("verifyAccessAssertion", () => {
  const config = () => {
    const c = accessConfig({ ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN, ACCESS_AUD: TEST_ACCESS_AUD });
    if (!c) throw new Error("config");
    return c;
  };

  it("署名・発行者・AUD が合えば、小文字のメールアドレスと発行時刻を返す", async () => {
    const token = await fixture.sign({
      email: "Learner@Example.COM",
      country: "jp",
      iat: 1_800_000_000,
    });
    await expect(verifyAccessAssertion(config(), token)).resolves.toMatchObject({
      email: "learner@example.com",
      issuedAt: 1_800_000_000,
      country: "JP",
      accessUserId: "access-user-id",
    });
  });

  it("別の鍵・別の AUD・別の発行者のトークンは拒否する", async () => {
    const cases = [
      await fixture.signForged({ email: "a@example.com" }),
      await fixture.sign({ email: "a@example.com", aud: "b".repeat(64) }),
      await fixture.sign({ email: "a@example.com", iss: "https://other.cloudflareaccess.com" }),
      "not-a-jwt",
    ];
    for (const token of cases) {
      await expect(verifyAccessAssertion(config(), token)).rejects.toThrow(/検証できませんでした/);
    }
  });

  it("公開鍵を取れなかったときは、トークンの拒否ではなく取得の失敗として返す", async () => {
    const token = await fixture.sign({ email: "a@example.com" });
    const failures = [
      new TypeError("fetch failed"),
      new joseErrors.JWKSTimeout(),
      new joseErrors.JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response"),
    ];
    for (const failure of failures) {
      const jwks = async () => {
        throw failure;
      };
      await expect(verifyAccessAssertion(config(), token, jwks)).rejects.toBeInstanceOf(
        AccessUnavailableError,
      );
    }
    const noKey = async () => {
      throw new joseErrors.JWKSNoMatchingKey();
    };
    await expect(verifyAccessAssertion(config(), token, noKey)).rejects.toBeInstanceOf(
      AccessAssertionError,
    );
  });

  it("メールアドレスの無いトークン (サービストークン) は受け付けない", async () => {
    const token = await fixture.sign({});
    await expect(verifyAccessAssertion(config(), token)).rejects.toThrow(/メールアドレス/);
    expect(() => identityFromAccessPayload({ email: "no-at-sign" })).toThrow();
  });
});
