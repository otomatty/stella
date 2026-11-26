---
sourceRefs: [SRC-claude-code-headless-20261118, SRC-claude-code-headless-unattended-20261126, SRC-claude-code-cli-reference-20261126, SRC-claude-code-sessions-20261126, SRC-claude-code-checkpointing-20261126, SRC-claude-code-best-practices-20261126, SRC-claude-code-settings-20261031, SRC-claude-code-platforms-20261126, SRC-claude-code-cloud-sessions-20261126, SRC-claude-code-server-managed-settings-20261126]
---
## 知識問題

### Q1. 夜間の CI で npm test とファイルの読み取りを許可し、その他の確認が必要な操作を止めたいです。どの構成を選びますか？
<!-- kind: single; skills: claude-code-config -->

- A. -p にして、CLAUDE.md に「テストだけ」と書く
- B. -p と dontAsk を指定し、Bash(npm test) と Read を事前に許可する
- C. -p と auto を指定し、確認が必要な操作が来るたびにモデルに判断させる

<details>
<summary>解答</summary>

**B** — dontAsk は、事前の許可がなく確認が必要な操作を拒否します。テストに要る許可を実行時に指定できます。

</details>

### Q2. 通常の -p で、初めて取得したリポジトリを CI から確認します。フックと MCP を自動で読み込む必要はありません。起動時の動作をどこで変えますか？
<!-- kind: single; skills: claude-code-config -->

- A. --output-format text を指定して、起動時の出力を減らす
- B. 最初の依頼に「フックも MCP も使わない」と書く
- C. --bare を指定し、フックや MCP などの自動読み込みを省く

<details>
<summary>解答</summary>

**C** — 通常の -p は信頼の確認を表示せず、リポジトリのフックや MCP を動かします。--bare を指定すると、それらの自動読み込みを省きます。

</details>

### Q3. 在庫テストの調査を終えて利用ガイドを直します。午後に在庫テストの調査を続ける予定です。今はどう操作しますか？
<!-- kind: single; skills: claude-code-config -->

- A. /clear で新しい会話を始め、午後は /resume で在庫テストの会話を選ぶ
- B. /compact で在庫テストの事情を要約してから、同じ会話でガイドを直す
- C. /branch で在庫テストの履歴をコピーして、その分岐でガイドを直す

<details>
<summary>解答</summary>

**A** — 新しい仕事に前の会話を持ち込まず、必要になったときだけ保存されたセッションを再開できます。

</details>

### Q4. Bash コマンドで Git に入っている一覧ファイルを編集しました。/rewind で編集前の時点を選ぶと、ファイルはどうなりますか？
<!-- kind: single; skills: claude-code-config -->

- A. Git の追跡対象なので、ファイルも編集前の内容に戻る
- B. Bash で編集した内容が、そのままファイルに残る
- C. コードと会話の両方を戻す項目を選んだときだけ、編集前の内容に戻る

<details>
<summary>解答</summary>

**B** — チェックポイントで追跡できる変更には範囲があります。Bash だけで変更した内容は /rewind の対象外です。

</details>

### Q5. 自分の .claude/settings.local.json に書いた書式チェックのフックを、リポジトリを取得したチームの CI でも動かしたいです。どこを直しますか？
<!-- kind: single; skills: claude-code-config -->

- A. 手元のユーザー設定にも同じフックを書き、両方から読まれるようにする
- B. CI の依頼文に「手元と同じフックで確認する」と書く
- C. 共有する .claude/settings.json と、フックが参照するスクリプトを Git に入れる

<details>
<summary>解答</summary>

**C** — CI は取得した共有設定とスクリプトを使います。手元だけの設定は取得した内容に含まれません。

</details>

### Q6. 組織の権限方針は開発端末に配ってあります。ウェブで開くクラウドセッションにも組織として届けたいです。どこで設定しますか？
<!-- kind: single; skills: claude-code-config -->

- A. 組織のサーバーで管理する設定に方針を登録する
- B. 開発端末の設定ファイルの名前をクラウドの依頼文に書く
- C. プロジェクトごとに CLAUDE.md に権限方針を書き写す

<details>
<summary>解答</summary>

**A** — サーバーで管理する設定は、対象のクラウドセッションに届きます。端末に配ったファイルがクラウドに転送される仕組みはありません。

</details>
