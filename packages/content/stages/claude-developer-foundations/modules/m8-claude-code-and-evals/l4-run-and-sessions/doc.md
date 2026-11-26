---
sourceRefs: [SRC-claude-code-headless-20261118, SRC-claude-code-headless-unattended-20261126, SRC-claude-code-cli-reference-20261126, SRC-claude-code-sessions-20261126, SRC-claude-code-checkpointing-20261126, SRC-claude-code-best-practices-20261126, SRC-claude-code-settings-20261031, SRC-claude-code-platforms-20261126, SRC-claude-code-cloud-sessions-20261126, SRC-claude-code-server-managed-settings-20261126]
---
# レッスン8-4 対話なしの実行とセッション

## このレッスンの目標

- [ ] CI で対話なしに実行し、事前に許可する操作を選べます。
- [ ] 作業を切り替える場面で、会話の開始・再開・圧縮を選べます。
- [ ] 手元、CI、クラウドでどの設定が届くかを説明できます。

## 8-4-1 対話なしで実行する

> **スクリプトや CI からは -p で対話なしに実行し、許可するツールを指定します。**

CI は、変更のたびにテストや検査を自動で行う仕組みです。夜間の CI でテストを実行し、失敗した項目を報告するとします。対話なしの実行は、以前は「ヘッドレス」と呼ばれていました。`-p` は `--print` の短い書き方です。

```sh
claude -p "npm test を実行し、失敗したテストを要約してください" --permission-mode dontAsk --allowedTools "Bash(npm test)" "Read"
```

`-p` は確認画面を出しません。モードの指定がなければ Manual が既定で、承認が必要な呼び出しは事前の許可などがなければ拒否されます。例では `dontAsk` を指定し、`npm test` と `Read` を事前に許可しています。`--allowedTools` は確認なしで実行できる操作を足すもので、もともと確認が要らない読み取りなども実行できます。止めたい操作は、`--disallowedTools` で拒否できます。

| 決めること | 指定 |
| --- | --- |
| 出力の読み方 | `--output-format text` は文章、`json` は後続の処理で読むデータ、`stream-json` は順に受け取るデータ |
| 入力の渡し方 | `--input-format text` または `stream-json` |
| 処理を続ける上限 | `--max-turns` でエージェントのターン数を指定 |
| 前の作業を続ける | `--continue` で直近、`--resume <id>` で ID を控えたセッション |

通常の `-p` では、フォルダーを信頼するか尋ねる画面が出ません。その場で確認することなく、リポジトリのフックや `.mcp.json` のサーバーが動きます。実行前に、取得するリポジトリとそこから読み込む構成を確認します。`--bare` を付けるとフック、Skill、プラグイン、MCP、CLAUDE.md などの自動読み込みを省きます。共有のフックや指示が必要な処理では、通常の実行を使います。`--dangerously-skip-permissions` を使うのは、隔離したコンテナーや VM の中だけです。

## 8-4-2 作業の区切りで会話を分ける

> **関係のない作業に移るときは会話を消し、同じ作業の続きはセッションを再開します。**

在庫テストの調査を終えて利用ガイドに移るなら、`/clear` で新しい会話を始めます。会話の記録は保存されるので、在庫テストに戻ったら再開できます。2 回修正を頼んでも同じずれが残るときも、`/clear` してから、分かった条件を入れた新しい指示で始めます。

| やりたいこと | 操作 |
| --- | --- |
| 前の仕事の話を持ち込まずに新しい仕事を始める | `/clear` |
| 直近の仕事を続ける | `claude -c` |
| 以前の仕事を選んで続ける | `claude -r` または会話中の `/resume` |
| 同じ指示から別案を試す | `--continue` や `--resume` と `--fork-session` を組み合わせるか、会話中で `/branch` |
| 同じ仕事の話を短くして続ける | `/context` で使用量を確認し、`/compact` で会話を要約する |

チェックポイントは、プロンプトごとに作られる復元用の記録です。`/rewind` を使うと、追跡しているコードの変更や会話を、選んだプロンプトの時点に戻せます。Bash コマンドだけで変更したファイルは追跡されません。その変更を戻すときは、差分や Git の記録を確認します。

## 8-4-3 設定が届く範囲

> **リポジトリに入れた設定はチームと CI に届き、端末だけの設定はその端末に残ります。**

CLI は端末から操作する方法で、使える機能が最も多い利用面です。手元で動かすデスクトップ、VS Code、JetBrains は、同じプロジェクトの設定、CLAUDE.md、MCP の構成を読みます。ウェブ（`claude.ai/code`）のクラウドセッションは、リポジトリを新しく取得して動きます。モバイルはクラウドセッションの操作や、手元のセッションの遠隔操作に使います。

| 設定や指示の置き場所 | 届く範囲 |
| --- | --- |
| Git に入れた `.claude/settings.json`、`CLAUDE.md`、`.claude/rules/`、`.claude/skills/`、`.claude/agents/`、`.mcp.json` | チーム、CI、クラウドセッションが取得したリポジトリ |
| `.claude/settings.local.json`、`~/.claude/` に置いた設定、手元だけに登録した MCP サーバー | 設定や登録をした端末 |
| 組織が端末に配った管理設定ファイル | そのファイルが配られた端末 |
| 組織がサーバーで管理する設定 | 配信の対象となるクラウドセッションや、対応する手元の環境 |

たとえば、書式を確かめるフックが手元でだけ動くとします。チームの CI にも届けるには、フックの共有設定と、その設定が参照するスクリプトをリポジトリに入れます。次に CI がその版を取得しているか、起動時に共有設定を読む指定かを確認します。

同じ設定項目が複数の場所にあるときは、強い順に、管理された設定、コマンドライン、`.claude/settings.local.json`、`.claude/settings.json`、`~/.claude/settings.json` です。権限のルールの一覧はこの順で置き換わる項目と違い、設定ファイルをまたいで足されます。

## もっと知りたい人へ

- [対話なしの起動、出力形式、ツールの許可（英語）](https://code.claude.com/docs/en/headless#basic-usage)
- [再開するセッションの選び方（英語）](https://code.claude.com/docs/en/sessions#resume-a-session)
- [コードと会話を戻せる範囲（英語）](https://code.claude.com/docs/en/checkpointing#limitations)
- [手元とクラウドで使える環境（英語）](https://code.claude.com/docs/en/platforms#where-to-run-claude-code)
- [組織から管理設定を配る方法（英語）](https://code.claude.com/docs/en/server-managed-settings#choose-between-server-managed-and-endpoint-managed-settings)

知識問題で、このレッスンの内容を確かめます。
