---
sourceRefs: [SRC-claude-code-github-actions-20261126, SRC-claude-code-headless-unattended-20261126]
id: 8-6-2
title: CI で動かす
takeaway: "CI では、秘密の値をシークレットに置き、許可するツールを絞って実行します。"
introduces: [シークレット]
requires: [CI, 対話なしの実行, 最小権限, 権限モード, allowedTools, モデル ID]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# CI で動かす
<!-- ノート: 検査済みの在庫レポートを CI で要約します。 -->
---
# 手元の設定が CI にない
手元では在庫レポートを要約できました。CI には担当者の認証情報がなく、実行中に承認する人もいません。
<!-- ノート: 実行が必要とする認証と、許可する操作を、ワークフローで明示します。 -->
---
# キーの渡し方と、操作の範囲を決める
CI では、秘密の値をシークレットに置き、許可するツールを絞って実行します。
<!-- ノート: シークレットは、認証情報を保管して実行時に渡す仕組みです。無人の実行では、作業に必要な許可をあらかじめ決めます。 -->
---
# 要約するステップに渡す
```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "reports/stock.md を読み、補充が必要な商品を要約してください。"
    claude_args: "--model claude-opus-5-5 --permission-mode dontAsk --allowedTools Read"
```
<!-- ノート: 信頼できるリポジトリの版を取得したジョブで使う一部の設定です。prompt を渡すと呼びかけを待たずに動きます。編集や Bash の追加許可は与えていません。 -->
---
# CI が取得する版を確認する
CI で読み込む `CLAUDE.md`、フック、`.mcp.json` を確認します。手元にだけ登録した接続は、CI にも用意します。
<!-- ノート: 対話なしの実行では信頼の確認が出ません。認証情報を渡すジョブには、確認済みの版を使います。 -->
---
<!-- _class: summary -->
# まとめ
CI では、秘密の値をシークレットに置き、許可するツールを絞って実行します。
<!-- ノート: CI では、秘密の値をシークレットに置き、許可するツールを絞って実行します。 -->
