/**
 * CSV 一括招待のパーサ。
 *
 * 受け付ける列: `email, display_name, role` (この順)。
 * - ヘッダ行 (1 列目が email/メール 等) は自動でスキップする。
 * - role は英語キー (student/instructor/admin/sales) と日本語ラベル (受講者/講師/管理者/営業) を許容。
 * - display_name 省略時はメールのローカル部を表示名にする。
 *
 * クォート付き CSV (`"田中, 翔太"`) にも最低限対応する簡易実装。
 */

import {
  isAssignableProfileRole,
  isValidEmail,
  type AssignableProfileRole,
  type InviteUserInput,
} from "./types.js";

const ROLE_ALIASES: Record<string, AssignableProfileRole> = {
  student: "student",
  受講者: "student",
  学習者: "student",
  instructor: "instructor",
  講師: "instructor",
  メンター: "instructor",
  admin: "admin",
  管理者: "admin",
  テナント管理者: "admin",
  sales: "sales",
  営業: "sales",
};

export interface ParsedInviteCsv {
  rows: InviteUserInput[];
  errors: string[];
}

/** 1 行を CSV フィールドに分割する (ダブルクォート対応の簡易実装)。 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function looksLikeHeader(cells: string[]): boolean {
  const first = (cells[0] ?? "").toLowerCase();
  return first === "email" || first === "メール" || first === "メールアドレス";
}

export function parseInviteCsv(text: string): ParsedInviteCsv {
  const rows: InviteUserInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const lines = text.split(/\r\n|\r|\n/);
  let started = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cells = splitCsvLine(line);
    if (!started && looksLikeHeader(cells)) {
      started = true;
      continue;
    }
    started = true;

    const email = (cells[0] ?? "").toLowerCase();
    if (!isValidEmail(email)) {
      errors.push(`${i + 1} 行目: メールアドレスが不正です (${cells[0] ?? ""})`);
      continue;
    }
    if (seen.has(email)) {
      errors.push(`${i + 1} 行目: メールアドレスが重複しています (${email})`);
      continue;
    }

    const displayName = (cells[1] ?? "").trim() || email.split("@")[0] || email;

    const roleRaw = (cells[2] ?? "").trim();
    let role: AssignableProfileRole = "student";
    if (roleRaw) {
      const mapped = ROLE_ALIASES[roleRaw] ?? ROLE_ALIASES[roleRaw.toLowerCase()];
      if (!mapped || !isAssignableProfileRole(mapped)) {
        errors.push(`${i + 1} 行目: ロールが不正です (${roleRaw})`);
        continue;
      }
      role = mapped;
    }

    seen.add(email);
    rows.push({ email, displayName, role });
  }

  return { rows, errors };
}
