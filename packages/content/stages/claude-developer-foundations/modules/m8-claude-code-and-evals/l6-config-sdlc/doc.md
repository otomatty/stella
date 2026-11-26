---
sourceRefs: [SRC-claude-code-model-config-20261126, SRC-claude-docs-model-ids-20261031, SRC-claude-code-github-actions-20261126, SRC-claude-code-headless-unattended-20261126, SRC-claude-code-settings-20261031, SRC-claude-docs-evals-20261031, SRC-claude-code-memory-load-20261126, SRC-claude-code-memory-rules-20261126, SRC-claude-code-best-practices-extension-20261126]
---
# レッスン8-6 開発の流れに組み込む

## このレッスンの目標

- [ ] 評価に使うモデルを完全なモデル ID で指定できます。
- [ ] CI で使う認証情報をシークレットに置き、作業に必要な許可を決められます。
- [ ] プロンプトと設定の変更前後を、同じ評価のセットで比較できます。

## 8-6-1 モデルを固定する

> **再現性が要る実行では、別名ではなく完全なモデル ID で固定します。**

在庫レポートのプロンプトを直し、先週の結果と比べます。設定にある `opus` はモデルの別名です。`sonnet`、`haiku`、`fable`、`best`、`default` なども、時期や接続先によって指す版が変わります。接続先には Anthropic の API、Amazon Bedrock、Google Cloud などがあります。評価でモデルの版をそろえるには、利用する提供元の完全なモデル ID を指定します。

```sh
claude -p "在庫レポートの項目を確認してください" --model claude-opus-5-5
```

1-2-3 で学んだように、Anthropic の API の `claude-opus-5-5` は日付なしでも固定のスナップショットを指します。チームで別名を使い続けるなら、`ANTHROPIC_DEFAULT_OPUS_MODEL` などの環境変数に提供元の完全な ID を入れ、別名の指す先を固定する方法もあります。

| 優先順 | 指定する場所 |
| --- | --- |
| 1 | 会話中に使う `/model` |
| 2 | 起動時に渡す `--model` |
| 3 | 環境変数 `ANTHROPIC_MODEL` |
| 4 | 設定ファイルの `model` |

CI の起動引数で ID を指定すれば、環境変数や設定ファイルに別の指定があっても、起動引数が選ばれます。評価結果には実際に使った ID を控えます。同じ ID を使うとモデルの版をそろえられます。例えば、プロンプトの変更を比べたいなら、入力と採点方法も前回とそろえます。

## 8-6-2 CI で動かす

> **CI では、秘密の値をシークレットに置き、許可するツールを絞って実行します。**

8-4-1 では Claude Code を対話なしで起動しました。GitHub Actions では `anthropics/claude-code-action@v1` に依頼と起動引数を渡せます。下は、確認済みのリポジトリの版を取得したジョブで、在庫レポートを要約するステップです。

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "reports/stock.md を読み、補充が必要な商品を要約してください。"
    claude_args: "--model claude-opus-5-5 --permission-mode dontAsk --allowedTools Read"
```

| 項目 | 決めること |
| --- | --- |
| `anthropic_api_key` | API キーを GitHub のシークレット `ANTHROPIC_API_KEY` に保存し、実行時に参照する。ワークフローには参照を書く |
| `prompt` | 指定するとワークフローの実行時に依頼を処理する。省くと既定の `@claude` などの呼びかけを待つ |
| `claude_args` | `--model` でモデルを指定する。無人の処理では `dontAsk` を選び、`--allowedTools` で追加する許可を作業に必要な操作に絞る |

この例では、レポートの読み取りを許可します。確認が必要な編集や Bash の操作には追加の許可を与えません。8-4-1 のとおり、もともと確認を要しない操作もあります。チームの権限のルールも合わせて確認してください。`--dangerously-skip-permissions` は隔離したコンテナーや VM の中でだけ使う指定です。

実行のたびに、取得したリポジトリの CLAUDE.md が読まれます。手元だけの `~/.claude/` の設定や MCP の登録は引き継がれません。必要な MCP の設定はチームで確認できる `.mcp.json` に置き、認証情報は実行環境から渡します。対話なしの実行では信頼の確認が出ず、フックや MCP サーバーが動きます。シークレットを渡すジョブでは、読み込む設定や部品を確認できる版を使います。外部からのプルリクエストの内容を取得するジョブとは分けておきます。

## 8-6-3 プロンプトを版で管理する

> **プロンプトと設定はリポジトリで版を管理し、変えるたびに同じ評価を回します。**

在庫レポートから欠品が漏れたとき、前回の指示を確認できれば、どの変更で漏れたかを調べられます。アプリのシステムプロンプトのファイル、Claude Code の CLAUDE.md、ルールファイル、Skill、共有設定を Git に入れます。チームの運用として、これらの変更をコードと同じように差分とレビューの対象にします。

1. 変更するファイルをレビューします。たとえば、`prompts/stock-report.md` に欠品を表の先頭へ出す指示を足します。
2. 8-2-2 で用意した評価のセットを、変更前と変更後に同じ採点条件で回します。モデルを替えるときも、同じ評価で比べます。一つずつ条件を替えると、結果の変化を調べやすくなります。
3. 結果に、指示と設定のコミット、実際のモデル ID、評価セットの版、落ちたケースの ID を残します。これで、同じ条件を指定して確認し直せます。

| 記録 | 指示と設定の版 | モデル ID | 評価のセット | 結果 |
| --- | --- | --- | --- | --- |
| 変更前 | 前のコミット ID | claude-opus-5-5 | 在庫レポート v3 | 18/20 合格 |
| 変更後 | 今回のコミット ID | claude-opus-5-5 | 在庫レポート v3 | 17/20 合格。前回通った欠品の例が不合格 |

合格した件数と、どのケースで判定が変わったかを確かめます。欠品が漏れた例をレビューで開き、関連する指示の差分を読みます。

## もっと知りたい人へ

- [モデルの別名と指定の順序（英語）](https://code.claude.com/docs/en/model-config#setting-your-model)
- [GitHub Actions の入力項目と起動引数（英語）](https://code.claude.com/docs/en/github-actions#advanced-configuration)
- [対話なしの実行で承認を扱う方法（英語）](https://code.claude.com/docs/en/headless#turn-off-permission-prompts-in-unattended-runs)
- [成功の基準と評価のセットの作り方（英語）](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)

知識問題で、このレッスンの内容を確かめます。
