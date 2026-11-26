import { describe, expect, it, vi } from "vitest";
import { checkProgressHtml } from "./task-check-progress-view.js";

vi.mock("vscode", () => ({}));

describe("checkProgressHtml", () => {
  it("手順ごとの状態、現在位置、完了数、所要時間を表示する", () => {
    const html = checkProgressHtml({
      steps: [
        { label: "準備", status: "passed", durationMs: 1800 },
        { label: "テスト", status: "failed", durationMs: 200 },
        { label: "環境", status: "error", durationMs: 0 },
        { label: "型の確認", status: "skipped", durationMs: 9999 },
        { label: "ファイル確認", status: "running" },
        { label: "仕上げ", status: "pending" },
      ],
    });

    expect(html).toContain('<section class="check-progress" aria-label="確認の進み具合">');
    expect(html).toContain('class="check-count">5 / 6<');
    expect(html).toContain('aria-valuemin="0" aria-valuemax="6" aria-valuenow="4"');
    expect(html).toContain('style="width:66.7%"');
    expect(html).toContain("<ol>");
    expect(html).toMatch(/<li class="passed">.*aria-label="通過">✓<.*準備.*1\.8 秒/);
    expect(html).toMatch(/<li class="failed">.*aria-label="要修正">✗<.*テスト.*0\.2 秒/);
    expect(html).toMatch(/<li class="error">.*aria-label="環境の問題">!<.*環境.*0\.0 秒/);
    expect(html).toMatch(/<li class="skipped">.*aria-label="省略">–<.*型の確認<\/span><\/li>/);
    expect(html).toMatch(
      /<li class="running" aria-current="step">.*aria-label="実行中"><\/span>.*実行中…/,
    );
    expect(html).toMatch(/<li class="pending">.*aria-label="まだ">・<.*仕上げ<\/span><\/li>/);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it("対象・注記・手順名をエスケープする", () => {
    const html = checkProgressHtml(
      { steps: [{ label: "手順<script>", status: "pending" }] },
      {
        target: "問2 <script>",
        note: "<script> を送らない",
      },
    );
    expect(html).toContain("問2 &lt;script&gt;");
    expect(html).toContain("手順&lt;script&gt;");
    expect(html).toContain("&lt;script&gt; を送らない");
    expect(html).not.toContain("<script>");
    expect(html).toContain('class="check-count">0 / 1<');
  });

  it("手順が決まるまでは見出しと準備中の表示を出す", () => {
    const html = checkProgressHtml({ steps: [] }, { target: "問2", note: "提出します" });
    expect(html).toContain("確認しています");
    expect(html).toContain("問2");
    expect(html).toContain("準備しています…");
    expect(html).not.toMatch(/progressbar|check-count|<ol>|提出します/);
  });
});
