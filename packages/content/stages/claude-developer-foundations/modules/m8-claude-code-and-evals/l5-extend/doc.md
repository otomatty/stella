---
sourceRefs: [SRC-claude-code-skills-20261118, SRC-claude-code-skill-config-20261126, SRC-claude-code-extensions-20261118, SRC-claude-code-memory-load-20261126, SRC-claude-code-memory-rules-20261126, SRC-claude-code-best-practices-extension-20261126, SRC-claude-code-hooks-guide-20261031, SRC-claude-code-hook-types-20261126, SRC-claude-code-plugins-20261118, SRC-claude-code-plugin-manifest-20261126, SRC-claude-code-plugin-create-20261126, SRC-claude-code-plugin-dependencies-20261126, SRC-claude-code-plugin-loading-20261126, SRC-claude-code-plugin-install-20261126, SRC-claude-code-marketplace-file-20261126]
---
# レッスン8-5 仕組みを選んで配る

## このレッスンの目標

- [ ] 繰り返す手順を Skill にまとめ、誰が呼び出せるかを決められます。
- [ ] チームの要件に合わせ、指示や処理を置く仕組みを選べます。
- [ ] 複数のリポジトリへ配るプラグインの構成と依存の版を決められます。

## 8-5-1 繰り返す手順を Skill にする

> **繰り返し使う手順や知識は、Skill にして必要なときだけ読み込ませます。**

週次の在庫レポートに、毎回同じ集計手順と書式を使います。このような手順や知識をひとまとめにしたものが Skill です。チームで使うなら、`.claude/skills/stock-report/SKILL.md` をリポジトリに入れます。

```markdown
---
description: 週次の在庫レポートをまとめるときに使う
---
在庫表を読み、補充が必要な商品を倉庫別に並べます。
項目の並びは [報告の見本](report-format.md) に合わせます。
```

会話の始まりに、Claude は Skill の説明を読みます。依頼に合うと判断して Claude が選ぶか、担当者が `/stock-report` と入力すると、本文を読み込みます。同じディレクトリに置いた `report-format.md` は、必要になって参照したときに読みます。説明には、使う場面が分かる言葉を入れてください。

| 使い方 | 冒頭の設定 |
| --- | --- |
| Claude の判断と担当者の操作の両方で呼び出す | `description` に使いどころを書く |
| 担当者が実行する時点を選ぶ | `disable-model-invocation: true`。説明も Claude の文脈に入らない |
| Claude だけが作業中に使う知識として置く | `user-invocable: false`。担当者は `/stock-report` で呼び出せない |

冒頭の設定項目はすべて任意です。Claude が使いどころを判断できるように、`description` は書くことが勧められています。他に、表示名を決める `name`、使うモデルを指定する `model`、別の文脈で実行する `context: fork` があります。`allowed-tools` は Skill を呼んだターンに使うツールを事前に承認します。一覧にないツールには普段の権限が適用されます。Skill の手順が毎回実行されるかは、呼び出しとモデルの振る舞いに左右されます。

自分のプロジェクトを横断するなら `~/.claude/skills/` に置けます。ほかにプロジェクトの `.claude/skills/`、プラグインの `skills/`、組織が管理する置き場所があります。組織、自分、プロジェクトで名前が重なると、この順で優先されます。プラグインの Skill は `/プラグイン名:skill名` で呼び分けます。以前の `.claude/commands/` のカスタムコマンドも使えます。同名の Skill があれば、そちらが優先されます。

## 8-5-2 仕組みを選ぶ

> **常に効かせるなら CLAUDE.md、繰り返すなら Skill、必ず実行するならフックを選びます。**

8-1 では、チームに配るレビュー手順の構成を考えました。別の作業でも、いつ効かせるか、モデルに判断を任せられるか、どこまで共有するかを読むと、置き場所が決まります。

| チームが求めること | 選ぶ仕組み | 選ぶ理由 |
| --- | --- | --- |
| どの作業でも日付の書式をそろえる。同じ約束を二度破られた | CLAUDE.md | 起動時に共通の約束を全文読み込む。モデルへの指示として使う |
| 倉庫のテストを扱うときだけ、欠品の例を入れるように伝える | ルールファイル | `.claude/rules/` に置き、対象のパスを指定すると該当ファイルを扱うときに読む |
| 週次の在庫レポートの依頼文と手順を何度も使う | Skill | 説明で見つけ、使うときに本文を読む |
| 倉庫ごとの長い調査は並行して行い、親の会話には要約を戻す | サブエージェント | 別の文脈で作業する役を `.claude/agents/*.md` に定義し、役に要るツールに絞れる |
| 承認済みの原本への編集を、実行前に必ず止める | フック | `PreToolUse` のコマンドに判定条件を書き、ツールの実行前に拒否できる |
| 社内の在庫システムから最新の数を取得する | MCP サーバー | 外部のデータや操作をツールで利用でき、接続の設定を `.mcp.json` で共有できる |
| 同じ集計の Skill と書式のフックを二つ目のリポジトリでも使う | プラグイン | 同じ部品を一式として配れる |

必須の検査を CLAUDE.md や Skill の手順に書くと、Claude が読み飛ばしたときに検査も抜けます。固定の条件で毎回判定するなら、イベントにコマンド型のフックを設定します。操作を止めるには、実行前の `PreToolUse` を選びます。`PostToolUse` が動く時点で操作は済んでいます。プロンプト型やエージェント型のフックはモデルによる判定が必要な場面に向きます。

## 8-5-3 まとめて配る

> **複数のリポジトリで使う設定は、プラグインにまとめ、依存の版の範囲を決めて配ります。**

プラグインは、複数のリポジトリに導入できるように部品をまとめたものです。マニフェストは、中身と版を表す設定ファイルです。`.claude-plugin/plugin.json` に置き、`name` を書きます。`version`、`description`、`author`、`dependencies` は必要に応じて書きます。

```text
stock-report-kit/
├── .claude-plugin/plugin.json
├── skills/stock-report/SKILL.md
├── agents/
├── hooks/hooks.json
└── .mcp.json
```

`.claude-plugin/` はマニフェストの置き場所です。部品は一段上のプラグイン直下に置きます。旧形式の `commands/` を含める場合も直下です。手元では `claude --plugin-dir ./stock-report-kit` で読み込み、`claude plugin validate ./stock-report-kit` で構成を確かめます。

依存とは、このプラグインが動くために必要な別のプラグインです。たとえば在庫システムに接続する `warehouse-data` と組み合わせます。

```json
{
  "name": "stock-report-kit",
  "version": "1.0.0",
  "dependencies": [{ "name": "warehouse-data", "version": "~2.1.0" }]
}
```

`~2.1.0` は 2.1 系の修正版までを受け入れる指定です。Git で配る依存先は、範囲を満たすリリースのタグから選ばれます。名前だけを書くと、更新時に配布元の新しい版を追います。依存先でツール名が変わると、古いツール名を使う手順が動かなくなります。

同じ依存に対する要求が 2.1 系と 3.0 系に分かれると、両方を満たす版がなく、導入は失敗します。導入済みの依存が指定の範囲から外れている場合、その依存を必要とするプラグインは無効になります。

配布先の一覧をマーケットプレイスと呼びます。`.claude-plugin/marketplace.json` に `name` と `owner` を書き、`plugins` の各項目にプラグインの `name` と取得先の `source` を書きます。受け取る人は `/plugin marketplace add owner/repo` で一覧を登録し、`/plugin install stock-report-kit@team-tools` のように導入します。

導入時は、自分の全プロジェクトに効くユーザー、チームで共有するプロジェクト、このリポジトリの自分だけに効くローカルから範囲を選びます。プロジェクトの設定に `enabledPlugins` を入れても、各自の環境への導入は必要です。Git から配る場合、マニフェストの `version` を上げると新しい版として更新されます。マニフェストにもマーケットプレイスの項目にも版を書かなければ、コミットを基に版が決まります。

## もっと知りたい人へ

- [Skill の設定と呼び出し方（英語）](https://code.claude.com/docs/en/skills#configure-skills)
- [作業に応じた仕組みの選び方（英語）](https://code.claude.com/docs/en/features-overview#match-features-to-your-goal)
- [プラグインの構成と手元での確認（英語）](https://code.claude.com/docs/en/plugins/create#test-and-debug)
- [マーケットプレイスに登録する項目（英語）](https://code.claude.com/docs/en/plugins/marketplace-reference#marketplace-file)
- [依存先の版の指定（英語）](https://code.claude.com/docs/en/plugins/dependencies#declare-dependencies)

知識問題で、このレッスンの内容を確かめます。
