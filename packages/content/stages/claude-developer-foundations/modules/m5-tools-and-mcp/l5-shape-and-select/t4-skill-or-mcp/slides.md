---
sourceRefs: [SRC-claude-agent-skills-20261118, SRC-claude-agent-skills-availability-20261126, SRC-claude-code-skills-20261118, SRC-mcp-server-concepts-20261118]
id: 5-5-4
title: 知識は Skill、接続は MCP
takeaway: "手順や知識を足すなら Skill、外のシステムにつなぐなら MCP を選びます。"
introduces: [Skill]
requires: [Claude, MCP, ツール]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 知識は Skill、接続は MCP
<!-- ノート: 学校の事務室で、貸出状況の報告書を毎週作ります。 -->
---
# 同じ書式と最新の台帳が要る
毎回同じ書式で報告します。貸出件数は週ごとに変わり、台帳で調べる必要があります。
<!-- ノート: 報告書を作るたびに、固定の手順とその週のデータが要ります。 -->
---
# 仕事を手順と取得に分ける
手順や知識を足すなら Skill、外のシステムにつなぐなら MCP を選びます。
<!-- ノート: Skill は Claude が参照する再利用可能な手順や知識です。MCP では、別のシステムへデータを取りに行けます。 -->
---
# 報告書の書式と台帳をつなぐ
- Skill の `SKILL.md` に集計の順番を書き、書式の見本を添える
- MCP のツールで今週の貸出件数を台帳から取る
<!-- ノート: Claude は報告書を作るときに手順を読み、必要な数値を MCP のツールから取得します。 -->
---
<!-- _class: summary -->
# まとめ
手順や知識を足すなら Skill、外のシステムにつなぐなら MCP を選びます。
<!-- ノート: 手順や知識を足すなら Skill、外のシステムにつなぐなら MCP を選びます。 -->
