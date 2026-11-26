---
sourceRefs: [SRC-claude-code-skill-config-20261126, SRC-claude-code-extensions-20261118, SRC-claude-code-hook-types-20261126, SRC-claude-code-plugin-manifest-20261126, SRC-claude-code-plugin-create-20261126, SRC-claude-code-plugin-dependencies-20261126, SRC-claude-code-plugin-install-20261126]
---
## 知識問題

### Q1. 月末の在庫レポートは、担当者が棚卸しを確認してから下書きを作ります。集計手順は共有し、担当者が明示的に呼んだときだけ使いたいです。どの設定を選びますか？
<!-- kind: single; skills: claude-code-config -->

- A. Skill に `user-invocable: false` を指定し、担当者がチャットに手順名を書く
- B. Skill に `disable-model-invocation: true` を指定し、担当者が `/stock-report` で呼ぶ
- C. Skill の説明に「月末だけ使う」と書き、担当者も `/stock-report` で呼べるようにする

<details>
<summary>解答</summary>

**B** — モデルからの呼び出しを無効にすると、担当者が実行する時点を選べます。説明への追記は Claude が選ぶ際の指示になります。

</details>

### Q2. 集計用の Skill に allowed-tools: Read を書きました。編集なども止められると考えていました。読み取り以外の操作を制限するには、どこを見直しますか？
<!-- kind: single; skills: claude-code-config -->

- A. Skill の説明に、読み取りだけの作業だと書く
- B. Skill の `allowed-tools` に `Grep` を足し、読み取りの方法を増やす
- C. 権限のルールで止めたいツールを拒否し、Skill の事前承認は読む操作に使う

<details>
<summary>解答</summary>

**C** — `allowed-tools` は指定したツールの事前承認です。止めたいツールには、権限のルールで制限をかけます。

</details>

### Q3. 担当者の承認が入った原本に、Claude Code が Edit を使う前の時点で、パスが一致したら毎回拒否したいです。どこに条件を書きますか？
<!-- kind: single; skills: claude-code-config -->

- A. コマンド型の `PreToolUse` フックでパスを照合し、一致したら拒否する
- B. `PostToolUse` フックでパスを照合し、一致したら警告を出す
- C. パスを指定したルールファイルに、承認済みの原本は編集しないと書く

<details>
<summary>解答</summary>

**A** — `PreToolUse` のコマンドなら、編集前に固定の条件で判定できます。実行後の警告では原本に変更が入ります。

</details>

### Q4. 倉庫が三つあり、それぞれの原因を独立して調べます。手元のログは読み取りだけ許可し、長い調査記録を親の会話に入れず、要約を集めたいです。何を使いますか？
<!-- kind: single; skills: claude-code-config -->

- A. Skill に三つの調査手順を書き、親の会話で順に進める
- B. 倉庫ごとの調査をサブエージェントに任せ、使うツールを絞って要約を戻す
- C. `CLAUDE.md` に「報告を短く」と書き、親の会話で全ログを読む

<details>
<summary>解答</summary>

**B** — サブエージェントなら、調査を別の文脈で進められます。役ごとに使うツールを絞り、親の会話には結果を返せます。

</details>

### Q5. 在庫レポート用のプラグインは、Git で配られる依存先の 2.1 系で動作を確認済みです。2.1 系の修正は受け取り、ツール名が変わった 2.2 以降は検証まで待ちたいです。どう配りますか？
<!-- kind: single; skills: claude-code-config -->

- A. 依存を名前だけで指定し、更新後に動作を確認する
- B. 自分のプラグインの `version` を上げ、依存は名前だけで指定する
- C. 依存に `~2.1.0` を指定し、2.1 系のリリースを使う

<details>
<summary>解答</summary>

**C** — 依存の範囲を指定すると、受け入れる版を 2.1 系に絞れます。自分のプラグインの版は、依存先の版の範囲とは別の指定です。

</details>

### Q6. 二つ目のリポジトリへ配るため、plugin.json と skills/ と hooks/ をすべて .claude-plugin/ に入れました。手元で読み込むと Skill が見つかりません。どこを直しますか？
<!-- kind: single; skills: claude-code-config -->

- A. `skills/` と `hooks/` をプラグイン直下へ移し、プラグインのディレクトリを指定して試す
- B. 全部その場所に置いたまま、ファイルを見つける手順を `CLAUDE.md` に足す
- C. 同じ構成のままリポジトリの `enabledPlugins` に名前を足し、もう一度開く

<details>
<summary>解答</summary>

**A** — `.claude-plugin/` はマニフェストの置き場所です。標準の構成では、Skill やフックの部品はプラグイン直下に置きます。

</details>
