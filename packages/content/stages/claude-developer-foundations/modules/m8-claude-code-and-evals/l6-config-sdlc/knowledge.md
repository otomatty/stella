---
sourceRefs: [SRC-claude-code-model-config-20261126, SRC-claude-docs-model-ids-20261031, SRC-claude-code-github-actions-20261126, SRC-claude-code-headless-unattended-20261126, SRC-claude-code-settings-20261031, SRC-claude-docs-evals-20261031, SRC-claude-code-memory-load-20261126]
---
## 知識問題

### Q1. CI は設定の model に opus を書いています。同じ評価のセットで、今週はプロンプトの変更だけを比べたいです。モデルはどう指定しますか？
<!-- kind: single; skills: claude-code-config -->

- A. 毎回 `opus` のまま実行し、評価の件数を増やす
- B. 手元で選べる最新のモデルを使い、CI の実行結果に `opus` と記録する
- C. 前回使った完全なモデル ID を `--model` に渡す

<details>
<summary>解答</summary>

**C** — 別名の指す先は変わることがあります。前回実際に使った ID を渡し、比べるモデルの版をそろえます。

</details>

### Q2. CI で model の設定と ANTHROPIC_MODEL の指定が残っています。ワークフローが渡す --model には、これらと異なる固定 ID を書きました。対話なしの起動時にどの指定が選ばれますか？
<!-- kind: single; skills: claude-code-config -->

- A. ワークフローが渡した `--model` の指定
- B. 環境変数 `ANTHROPIC_MODEL` の指定
- C. リポジトリの設定ファイルの `model` の指定

<details>
<summary>解答</summary>

**A** — 起動時の引数は、環境変数や設定ファイルより優先されます。設定ファイルの値だけを見て実行結果を記録すると、使ったモデルを取り違えます。

</details>

### Q3. 確認済みのリポジトリの版で、夜間に在庫レポートを読み取って要約します。呼びかけを待たずに実行し、確認が必要な操作の許可は読み取りに絞りたいです。何を指定しますか？
<!-- kind: single; skills: claude-code-config -->

- A. シークレットを参照し、`prompt` を省いて `claude_args` で読み取りを許可する
- B. シークレットを参照し、`prompt` と `dontAsk` を指定して `Read` を事前に許可する
- C. シークレットを参照し、`prompt` に「編集しない」と書いて権限確認を省く

<details>
<summary>解答</summary>

**B** — `prompt` を渡すと呼びかけを待ちません。API キーはシークレットから渡し、`dontAsk` と作業に要る許可を組み合わせます。

</details>

### Q4. 倉庫データを読む MCP サーバーを手元だけに登録しています。確認済みの版を使う CI では、そのツールが見つかりません。どの対応を選びますか？
<!-- kind: single; skills: claude-code-config -->

- A. CI の `prompt` にツールの名前を追記して同じジョブを実行する
- B. ツールを追加で許可する引数を書き、接続の設定は手元だけに置く
- C. 接続の設定を `.mcp.json` で共有し、必要な認証情報を CI に渡す

<details>
<summary>解答</summary>

**C** — 手元だけの MCP の登録は CI に届きません。接続の設定を取得したリポジトリから読み込めるようにし、認証情報は CI で用意します。

</details>

### Q5. 欠品を強調する指示を追加します。提案には新しいモデルへの切り替えも含まれています。欠品が漏れたときに、どちらの変更が影響したかを調べるにはどう進めますか？
<!-- kind: single; skills: claude-evals -->

- A. 指示とモデルを一つずつ替え、同じ入力と採点の条件で比較する
- B. 指示とモデルを同時に切り替え、先週と同じ評価を一回だけ回す
- C. 指示を変えたら欠品の例だけに絞り、その結果を先週の全件の合格率と比べる

<details>
<summary>解答</summary>

**A** — 他の条件をそろえた評価で、一つずつ変更します。同時に替えると、結果が変わったときにどちらの変更が効いたかを調べにくくなります。

</details>

### Q6. 評価の集計表に、日付と合格率だけが残っています。報告の誤りを見つけたとき、同じ条件で評価し直せるように、次から何を記録しますか？
<!-- kind: single; skills: claude-evals -->

- A. チーム名と実行時刻、画面に表示されるモデルの別名を記録する
- B. 指示と設定のコミット、実際のモデル ID、評価セットの版と落ちたケースを記録する
- C. 不合格の回答を保存し、最新のプロンプトがある共有メモのリンクを貼る

<details>
<summary>解答</summary>

**B** — コミットとモデル ID、評価セットの版があれば、その実行の入力と採点の条件をたどれます。落ちたケースの記録は、結果の照合に使えます。

</details>
