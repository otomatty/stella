import { describe, expect, it } from "vitest";

import { securityEventsQuery } from "./security-api";
import {
  alertTransitions,
  barPercent,
  countryLabel,
  detailEntries,
  eventKindLabel,
  formatDayLabel,
  formatJst,
  previousCountryIfChanged,
  ruleInfo,
  shortUserAgent,
} from "./security-format";

describe("formatJst", () => {
  it("formats in Japan time regardless of the viewer's time zone", () => {
    // 2026-10-11T15:30:05Z = 日本時間 10/12 0:30:05
    expect(formatJst("2026-10-11T15:30:05.000Z")).toBe("2026/10/12 00:30:05");
    expect(formatJst("2026-10-11T15:30:05.000Z", false)).toBe("2026/10/12 00:30");
  });

  it("shows a dash for missing values and keeps unreadable ones", () => {
    expect(formatJst(null)).toBe("—");
    expect(formatJst("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDayLabel", () => {
  it("adds the weekday without shifting the date", () => {
    expect(formatDayLabel("2026-10-12")).toBe("10/12 (月)");
    expect(formatDayLabel("2026-10-11")).toBe("10/11 (日)");
    expect(formatDayLabel("oops")).toBe("oops");
  });
});

describe("countryLabel", () => {
  it("names the country in Japanese with its code", () => {
    expect(countryLabel("JP")).toBe("日本 (JP)");
    expect(countryLabel("us")).toBe("アメリカ合衆国 (US)");
    expect(countryLabel(null)).toBe("—");
  });
});

describe("previousCountryIfChanged", () => {
  it("returns the previous country when the sign-in country changed", () => {
    expect(previousCountryIfChanged({ country: "US", metadata: { previous_country: "JP" } })).toBe(
      "JP",
    );
  });

  it("ignores the same country, missing values and non-strings", () => {
    expect(previousCountryIfChanged({ country: "JP", metadata: { previous_country: "jp" } })).toBe(
      null,
    );
    expect(previousCountryIfChanged({ country: "JP", metadata: {} })).toBeNull();
    expect(previousCountryIfChanged({ country: null, metadata: { previous_country: "JP" } })).toBe(
      null,
    );
    expect(previousCountryIfChanged({ country: "US", metadata: { previous_country: 1 } })).toBe(
      null,
    );
  });
});

describe("shortUserAgent", () => {
  it("summarizes common browsers and operating systems", () => {
    expect(
      shortUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome 129 / Windows");
    expect(
      shortUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.2792.79",
      ),
    ).toBe("Edge 129 / Windows");
    expect(
      shortUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      ),
    ).toBe("Safari 18 / macOS");
    expect(
      shortUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari 18 / iOS");
    expect(
      shortUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0"),
    ).toBe("Firefox 131 / Linux");
  });

  it("truncates unknown agents and handles empty values", () => {
    expect(shortUserAgent("curl/8.5.0")).toBe("curl/8.5.0");
    expect(shortUserAgent("x".repeat(60), 10)).toBe(`${"x".repeat(9)}…`);
    expect(shortUserAgent(null)).toBe("—");
  });
});

describe("labels", () => {
  it("uses the shared labels and falls back to the raw value", () => {
    expect(eventKindLabel("access.denied")).toBe("Access でのログイン拒否");
    expect(eventKindLabel("unknown.kind")).toBe("unknown.kind");
    expect(ruleInfo("new_location")?.label).toBe("いつもと違う国からのサインイン");
    expect(ruleInfo("no_such_rule")).toBeNull();
  });
});

describe("detailEntries", () => {
  it("lists values as text and drops empty ones", () => {
    expect(
      detailEntries({
        country: "US",
        count: 5,
        ips: ["203.0.113.5", "198.51.100.7"],
        extra: { a: 1 },
        empty: "",
        none: null,
      }),
    ).toEqual([
      ["国", "US"],
      ["count", "5"],
      ["ips", "203.0.113.5, 198.51.100.7"],
      ["extra", '{"a":1}'],
    ]);
    expect(detailEntries(null)).toEqual([]);
  });
});

describe("alertTransitions", () => {
  it("offers the next states but never the current one", () => {
    expect(alertTransitions("open")).toEqual(["acknowledged", "resolved"]);
    expect(alertTransitions("acknowledged")).toEqual(["resolved", "open"]);
    expect(alertTransitions("resolved")).toEqual(["open"]);
  });
});

describe("barPercent", () => {
  it("scales to the column maximum and keeps small values visible", () => {
    expect(barPercent(0, 10)).toBe(0);
    expect(barPercent(10, 10)).toBe(100);
    expect(barPercent(1, 1000)).toBe(4);
    expect(barPercent(5, 0)).toBe(0);
  });
});

describe("securityEventsQuery", () => {
  it("joins kinds and omits empty conditions", () => {
    expect(securityEventsQuery({})).toBe("");
    expect(
      securityEventsQuery({
        kinds: ["session.start", "access.denied"],
        days: 30,
        q: "  203.0.113.5 ",
        before: "2026-10-12T00:00:00.000Z",
        limit: 100,
      }),
    ).toBe(
      "?kind=session.start%2Caccess.denied&days=30&q=203.0.113.5&before=2026-10-12T00%3A00%3A00.000Z&limit=100",
    );
    expect(securityEventsQuery({ q: "   " })).toBe("");
  });
});
