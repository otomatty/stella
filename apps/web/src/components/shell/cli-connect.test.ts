import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CliConnectIssued, CliConnectSection } from "@/components/shell/SettingsPage";
import { formatCliCodeExpiry, showCliConnectSection } from "@/lib/cli-connect";

const UA = {
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
};

describe("CLI で接続する", () => {
  it("パソコンでは節を出し、スマートフォンとタブレットでは出さない", () => {
    expect(showCliConnectSection({ userAgent: UA.windows })).toBe(true);
    expect(showCliConnectSection({ userAgent: UA.iphone })).toBe(false);
    expect(showCliConnectSection({ userAgent: UA.ipad, maxTouchPoints: 5 })).toBe(false);
    const pc = renderToStaticMarkup(
      createElement(CliConnectSection, {
        enabled: true,
        device: { userAgent: UA.windows },
      }),
    );
    expect(pc).toContain("CLI で接続する");
    expect(pc).toContain("接続コードを発行");
    const phone = renderToStaticMarkup(
      createElement(CliConnectSection, {
        enabled: true,
        device: { userAgent: UA.iphone },
      }),
    );
    expect(phone).toBe("");
    expect(
      renderToStaticMarkup(
        createElement(CliConnectSection, {
          enabled: false,
          device: { userAgent: UA.windows },
        }),
      ),
    ).toBe("");
  });

  it("発行したコードとコマンドを出し、一度きりと有効期限を書く", () => {
    const markup = renderToStaticMarkup(
      createElement(CliConnectIssued, {
        code: "AB12CD34",
        expiresAt: "2026-11-06T10:50:00.000Z",
        onCopy: () => undefined,
      }),
    );
    expect(markup).toContain("AB12CD34");
    expect(markup).toContain("stella login --code AB12CD34");
    expect(markup).toContain("一度しか使えません");
    expect(markup).toContain(formatCliCodeExpiry("2026-11-06T10:50:00.000Z"));
    expect(formatCliCodeExpiry("2026-11-06T10:50:00.000Z")).toContain("19:50");
  });
});
