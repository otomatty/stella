---
durationMinutes: 120
title: 模擬試験（70問・120分）
sourceRefs: [SRC-anthropic-context-engineering-20261031, SRC-anthropic-effective-agents-20261031, SRC-anthropic-effective-agents-defs-20261031, SRC-anthropic-writing-tools-20261031, SRC-claude-code-agent-loop-control-20261031, SRC-claude-code-headless-20261118, SRC-claude-code-hooks-guide-20261031, SRC-claude-code-memory-20261031, SRC-claude-code-plugins-20261118, SRC-claude-code-sdk-mcp-20261031, SRC-claude-code-sdk-permission-rules-20261031, SRC-claude-code-sdk-permissions-20261031, SRC-claude-code-sdk-sessions-20261031, SRC-claude-code-sdk-subagents-20261031, SRC-claude-code-sdk-subagents-create-20261031, SRC-claude-code-settings-20261031, SRC-claude-code-skills-20261118, SRC-claude-developer-guide-v11-20261118, SRC-claude-docs-api-key-20261031, SRC-claude-docs-batch-20261031, SRC-claude-docs-batch-usage-20261031, SRC-claude-docs-caching-structure-20261031, SRC-claude-docs-choosing-model-20261031, SRC-claude-docs-choosing-start-20261031, SRC-claude-docs-compaction-20261031, SRC-claude-docs-context-overflow-20261031, SRC-claude-docs-context-windows-20261031, SRC-claude-docs-cost-intelligence-20261031, SRC-claude-docs-effort-20261031, SRC-claude-docs-effort-set-20261031, SRC-claude-docs-errors-20261031, SRC-claude-docs-eval-grading-20261031, SRC-claude-docs-evals-20261031, SRC-claude-docs-files-20261031, SRC-claude-docs-hallucination-advanced-20261031, SRC-claude-docs-hallucinations-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-jailbreaks-20261031, SRC-claude-docs-latency-20261031, SRC-claude-docs-mcp-connector-20261031, SRC-claude-docs-mcp-connector-usage-20261031, SRC-claude-docs-messages-20261031, SRC-claude-docs-messages-system-20261031, SRC-claude-docs-model-ids-20261031, SRC-claude-docs-pdf-20261031, SRC-claude-docs-prompt-caching-20261031, SRC-claude-docs-prompting-20261031, SRC-claude-docs-rate-limits-20261031, SRC-claude-docs-refusals-20261031, SRC-claude-docs-stop-reasons-20261031, SRC-claude-docs-streaming-20261031, SRC-claude-docs-streaming-deltas-20261031, SRC-claude-docs-strict-tool-use-20261031, SRC-claude-docs-structured-outputs-20261031, SRC-claude-docs-thinking-20261031, SRC-claude-docs-token-counting-20261031, SRC-claude-docs-tool-errors-20261031, SRC-claude-docs-tool-use-20261031, SRC-claude-docs-tool-use-when-20261031, SRC-claude-docs-ts-sdk-20261031, SRC-claude-docs-vision-20261031]
---
## 知識問題

### Q1. 問い合わせ窓口で通常の Messages API を使っています。「先ほどの青い方を 2 個に」という依頼が届きました。サーバーには前の質問と、青・白の候補を出した応答が残っています。次のリクエストをどう作りますか。
<!-- kind: single; skills: claude-messages-request -->

- A. 前の応答の id と今回の依頼だけを messages に入れる
- B. 直前の会話往復に今回の依頼を足す
- C. 今回の依頼を 2 回並べ、直近の候補を補ってもらう
- D. 直前の user の質問と今回の変更を送り、候補の色はアプリで保存した assistant の応答から省く

<details>
<summary>解答</summary>

**B** — 「青い方」は前の応答にある候補を指します。この呼び出し方ではサーバー側で履歴を組み直す必要があります。応答の id だけでは候補の中身が届きません。（範囲 D2 Applications and Integration。復習 1-1-1・Using the Messages API）

</details>

### Q2. 受付票の分類候補を 100 件で比較しました。採用条件は正解が 96 件以上、95% の応答が 2 秒以内です。条件を満たす中で最も安い案を選んでください。
<!-- kind: single; skills: claude-model-selection -->

- A. 小型モデルだけで処理する（正解 93 件・1.0 秒・費用 4）
- B. 全件を大型モデルで処理する（正解 99 件・3.1 秒・費用 14）
- C. 小型＋難例振り分け（正解 97 件・1.8 秒・費用 7）
- D. 参照データを増やして小型モデルだけで処理する（正解 95 件・0.9 秒・費用 5）

<details>
<summary>解答</summary>

**C** — 振り分け案は正解数と待ち時間の両方を満たします。小型モデルだけでは 3 件、大型モデルだけでは 1.1 秒、条件に届きません。（範囲 D5 Model Selection and Optimization。復習 3-1-1・Choosing the right model）

</details>

### Q3. 記事の配信は「要約する、禁止表現を検査する、合格分だけ翻訳する」の順です。編集者が、どの検査で記事を止めたか後から調べます。どの実装を選びますか。
<!-- kind: single; skills: claude-agentic-choice -->

- A. 翻訳と検査を同じモデルに依頼し、最後の回答だけ保管する
- B. 手順をコードで固定し、検査結果を記録してから翻訳の実行を決める
- C. エージェントに検査と翻訳のツールを渡し、実行順を毎回選ばせる
- D. 禁止表現の検査は、翻訳の後にまとめて行う

<details>
<summary>解答</summary>

**B** — 検査が翻訳の前提で、失敗した段階の記録も必要です。段を分けたワークフローなら、検査に通らない記事をその時点で止められます。（範囲 D1 Agents and Workflows。復習 6-1-1・Building effective agents）

</details>

### Q4. 問い合わせ分類で通常の返品は正解しますが、「返したいわけではない」という相談でも返品を選びます。例を見直します。採用する変更を 2 つ選んでください。
<!-- kind: multiple; skills: claude-prompt-design -->

- A. 否定表現を含む相談に、期待する正しい分類を添える
- B. 例の件数を倍にするため、正解している通常の返品例を複製する
- C. 語句が似ていて正解ラベルが異なる例を、同じ書式で並べる
- D. 例の答えは隠し、分類の特徴をモデルに推測させる

<details>
<summary>解答</summary>

**A, C** — 見分けたいのは「返品」という語の有無より、相談者が何を希望するかです。判断の境目をまたぐ入力と正しい出力を対で示すと、既存の例に足りない条件を補えます。（範囲 D6 Prompt and Context Engineering。復習 4-1-1・4-1-2・Prompting best practices）

</details>

### Q5. 配送照会で assistant が client tool を 2 回要求しました。id は t1 と t2 です。t2 の結果が先に到着しました。次の Messages API 呼び出しをどう組み立てますか。
<!-- kind: single; skills: claude-tool-use -->

- A. 結果だけを到着順に 2 つの user メッセージとして送る
- B. 先に届いた結果を t1 として返し、あとから t2 を返す
- C. assistant 応答の直後の user に、t1・t2 に対応する両結果を置く
- D. 2 ツールの結果を到着順で 1 つの tool_result に連結し、最初の呼び出しの id を付ける

<details>
<summary>解答</summary>

**C** — 到着順は注文との対応を表しません。各 tool_use に割り当てられた id を結果にも付け、両方の呼び出しに応えた履歴を送ります。（範囲 D8 Tools and MCP。復習 5-1-1・5-1-2・Handle tool calls / Tool use with Claude）

</details>

### Q6. 複数の利用者が使う要約 API で、運営者が決めた文体と、利用者が要約したい本文を別々に組み立てます。毎回の呼び出しで正しく渡せる実装はどれですか。
<!-- kind: single; skills: claude-messages-request -->

- A. 本文も文体の指定も system に追記する
- B. 利用者の入力を assistant、文体を user に入れる
- C. 文体はトップレベルの system、依頼と本文は user に置く
- D. 文体の指定を最初の assistant 発言として保存し、次の user に運営者の文体と利用者の入力をまとめる

<details>
<summary>解答</summary>

**C** — 文体は運営者の共通指示です。本文を system に混ぜると、誰の指示かを区別しにくくなります。Messages API の system は messages 配列の外に置きます。（範囲 D2 Applications and Integration。復習 1-1-2・Using the Messages API）

</details>

### Q7. メールを読むツールが返した本文には、転送先を変えるよう求める文章もありました。アプリの仕事はメールの要約だけです。設計レビューで採用する変更を 2 つ選んでください。
<!-- kind: multiple; skills: claude-safety -->

- A. 取得元と本文を、読み取りツールの tool_result 内のデータとして渡す
- B. 転送先を確認しやすいように、メール本文を system の末尾に付ける
- C. 本文を引用符で囲んでから、転送設定の変更権限を渡す
- D. 要約を担当する処理から転送先を変更するツールを外す

<details>
<summary>解答</summary>

**A, D** — メールの差出人にアプリの操作を指示する権限はありません。本文の出所を保ち、要約に不要な操作も実行できない構成にします。文字を囲むだけでは権限を制限できません。（範囲 D7 Security and Safety。復習 7-1-1・Mitigate jailbreaks and prompt injections / Handle tool calls）

</details>

### Q8. 契約項目を JSON に抽出する処理が HTTP 200 を受けました。末尾が途中で切れ、stop_reason は max_tokens です。保存処理を呼ぶ前にどうしますか。
<!-- kind: single; skills: claude-structured-output -->

- A. 閉じ括弧を補って JSON が読めたら保存する
- B. 今回の出力は未完成として保存を止め、上限を見直して再生成する
- C. HTTP 200 を成功の条件にして保存し、欠落は翌日の集計で探す
- D. 本文が途中で切れた場合も、抽出済みの契約項目だけを正式な結果として保存し、未出力の項目には null を入れる

<details>
<summary>解答</summary>

**B** — 出力トークンの上限に達しています。括弧だけを補っても未生成の項目は復元できません。完全な応答を得て検証してから保存します。（範囲 D6 Prompt and Context Engineering。復習 4-2-2・1-3-2・Structured outputs / Stop reasons and fallback）

</details>

### Q9. 分類サービスのモデルを更新します。公開のベンチマークでは新版が優勢ですが、自社には略称を含む返品依頼が多くあります。切り替えを判断できる比較はどれですか。
<!-- kind: single; skills: claude-evals, claude-model-selection -->

- A. 新版を 1 日使い、前日の旧版の全体平均と比べる
- B. 同じラベル付きの通常例・略称例に両版をかけ、正解数と処理時間・費用を比べる
- C. 略称例を追加した新版を、通常例だけで測った旧版と比べる
- D. 失敗した略称例だけで新版を評価する

<details>
<summary>解答</summary>

**B** — 入力の内訳を固定すると、難しい依頼がたまたま多かった日の影響を除けます。略称のある群も分けて、採用条件を満たしたか確かめます。（範囲 D4 Eval, Testing, and Debugging。復習 3-1-2・8-2-2・Choosing the right model / Define success criteria and build evaluations）

</details>

### Q10. 社内手引きの検索結果を使う窓口を作ります。正答に必要な箇所は、すでに毎回 1 回の検索でそろいます。まずどの方法で品質と実装費用を見積もりますか。
<!-- kind: single; skills: claude-agentic-choice -->

- A. 一律に 3 人のサブエージェントを起動し、多数決の精度を測る
- B. 検索結果を添えて一度回答させ、失敗例を調べる
- C. 検索語を変えて再検索し続けるループから作り、平均回数を測る
- D. 検索結果を渡す前に質問を必ず分解し、分解した件数が多いほどよい構成として費用を見積もる

<details>
<summary>解答</summary>

**B** — 手元に根拠がそろう仕事なら、まず回答を作る段階の失敗を特定できます。追加の探索が必要な例が見つかれば、その例で追加の処理の効果を測れます。（範囲 D1 Agents and Workflows。復習 6-1-2・Building effective agents）

</details>

### Q11. 応答の content に text「確認します」、tool_use、text「照会中です」がこの順で入りました。ツールの実行を別の処理に任せ、画面には表示用の文をすべて残します。どの読み方にしますか。
<!-- kind: single; skills: claude-messages-request -->

- A. 先頭のブロックの text を 1 回だけ表示する
- B. 最後に見つけた text で画面全体を置き換える
- C. text ブロックを元の順で表示する
- D. tool_use の手前で表示用の文字列を確定し、それ以降の text はツール用の説明として省く

<details>
<summary>解答</summary>

**C** — 先頭だけでも最後だけでも文が欠けます。tool_use は別の処理に渡し、表示用のブロックだけを元の順に集めます。（範囲 D2 Applications and Integration。復習 1-1-4・Using the Messages API）

</details>

### Q12. 保守の手引き 2 冊から、夜間に連絡する条件を抜き出します。似た節が両方にあり、回答には根拠の手引き名と節も必要です。どの入力で試しますか。
<!-- kind: single; skills: claude-prompt-design -->

- A. 手引き名を消して 2 冊を続けて置き、末尾で短い回答を求める
- B. 出典別に資料を区切り、末尾で根拠の節も問う
- C. 手引きごとに結論だけを抜き、手引き名と例外条件を省いて渡す
- D. 両方の原文を一つの資料にまとめて節番号を振り直し、根拠には新しい節番号だけを付けてもらう

<details>
<summary>解答</summary>

**B** — どの文書のどの記述を使ったか追える入力が必要です。名前と本文の対応を残し、長い資料を読んだ後で答える問いをはっきり指定します。（範囲 D6 Prompt and Context Engineering。復習 4-1-3・4-1-4・Prompting best practices）

</details>

### Q13. 注文照会 t4 は「注文なし」と返り、在庫照会 t5 はサービスに接続できませんでした。どちらも client tool です。利用者に欠品と誤案内しないため、どの結果を返しますか。
<!-- kind: single; skills: claude-tool-use -->

- A. 両方を成功として返し、どちらの件数も 0 にする
- B. t4 は通常の結果、t5 は is_error 付きの結果を各 id で返す
- C. 正常だった t4 だけを返し、t5 の結果は省く
- D. t4 と t5 の結果を連結していずれか一方の id で返し、もう一方はアプリの障害ログでだけ識別する

<details>
<summary>解答</summary>

**B** — 0 件という結果と、確かめられなかった状態は異なります。失敗した呼び出しにも結果を返すと、モデルは確認できた範囲で回答できます。（範囲 D8 Tools and MCP。復習 5-1-3・Handle tool calls）

</details>

### Q14. プロジェクトのフックを点検します。対象は Claude Code の Edit と Write で行う設定ファイルの変更です。ファイルがすでに書き換わってから警告が出ました。実行前に止める設計はどれですか。
<!-- kind: single; skills: claude-code-config -->

- A. 対象ファイルを CLAUDE.md に書き、変更時は理由を説明させる
- B. PostToolUse で書き換え後に警告を出し、そのまま処理を続ける
- C. PreToolUse で対象ツールの入力パスを判定し、該当する呼び出しを拒否する
- D. 変更時には PostToolUse の終了コードで編集を取り消す

<details>
<summary>解答</summary>

**C** — 変更を阻止するには、ツールが動く前に対象を照合して拒否します。事後の通知が届いたときには、すでにファイルに変更が入っています。（範囲 D3 Claude Code。復習 8-1-1・8-1-2・How Claude remembers your project / Automate actions with hooks）

</details>

### Q15. ブラウザーから問い合わせるアプリを公開します。ビルドした JavaScript は全利用者が取得でき、Claude API の料金は運営者が負担します。どこで API キーを使いますか。
<!-- kind: single; skills: claude-sdk-setup -->

- A. フロントエンドのビルド時に環境変数から読み、最終ファイルに埋め込む
- B. キーは自社サーバーに保管し、利用者の認証後にサーバーから呼ぶ
- C. ページを開いた直後だけブラウザーへキーを返し、画面からは隠す
- D. 最初のログイン時にキーを短時間だけブラウザーへ渡して、期限内は利用者の端末が直接 Claude API を呼ぶ

<details>
<summary>解答</summary>

**B** — ブラウザーに配った値は、ビルド時に埋め込んでも最初の通信だけで返しても取得できます。サーバーにキーを保持すると利用者の端末に渡さず呼び出せます。（範囲 D2 Applications and Integration。復習 1-2-2・Get your Claude API key）

</details>

### Q16. 要約サービスの採用基準は品質 95 点以上、応答時間 3 秒以内です。現行は 97 点・2.8 秒ですが高価です。比較は同じ入力で行いました。費用を下げて基準を保てる候補はどれですか。
<!-- kind: single; skills: claude-model-selection -->

- A. 小型モデルに固定する（費用 60% 減、品質 92 点、1.5 秒）
- B. effort 低（25% 減・96 点・2 秒）
- C. 夜間バッチに移す（費用 50% 減、品質 97 点、完了時刻は翌日）
- D. 評価で最も高かったモデルを使い、回答の長さを半分にする（費用 30% 減、品質 94 点、1.8 秒）

<details>
<summary>解答</summary>

**B** — 安くなるだけでは採用条件を満たしません。測定値では effort を下げた案だけが品質と応答時間の両方を保っています。（範囲 D5 Model Selection and Optimization。復習 3-1-3・Choosing the right model / Effort）

</details>

### Q17. 構成案を作る段と、記事本文を作る段をつなぎます。社内規則により、必須の見出しが欠けた構成案で本文作成を始めてはいけません。どこでどう判定しますか。
<!-- kind: single; skills: claude-workflows -->

- A. 本文作成後、別のモデルで見出しの欠落を採点する
- B. 構成案を作る指示に「必須」と追記し、毎回本文作成へ進む
- C. 構成案を受け取った時点で必須見出しをコードで照合し、不足したら次の呼び出しを止める
- D. 本文作成と並列に構成案の必須見出しを検査し、不足があれば生成済みの本文を破棄する

<details>
<summary>解答</summary>

**C** — 本文作成前に確認できる機械的な条件です。中間結果の検査をここに置けば、不備を残したまま本文の生成費用が発生するのを防げます。（範囲 D1 Agents and Workflows。復習 6-2-1・Building effective agents）

</details>

### Q18. 試験環境だけで新モデルを評価し、合格するまで本番の呼び出し先を固定します。運用担当が選ぶ手順はどれですか。
<!-- kind: single; skills: claude-evals -->

- A. 評価環境と本番の両方を先に更新し、問題が起きたら比較する
- B. 本番のモデル ID を記録し、新しい ID で同じ入力を評価してから設定を切り替える
- C. モデル名をプロンプトに記入し、同じ API リクエストで 2 つの版に答えさせる
- D. モデル名だけを固定し、個別の版は評価後に調べる

<details>
<summary>解答</summary>

**B** — 呼び出し先はリクエストのモデル ID で指定します。比較した版を記録して設定を切り替えれば、挙動が変わった時点を追えます。（範囲 D4 Eval, Testing, and Debugging。復習 1-2-3・8-2-2・Model IDs and versioning / Define success criteria and build evaluations）

</details>

### Q19. 公開前の原稿は、確認用の呼び出しが許可を返した場合だけ自動配信できます。今回は HTTP 200、stop_reason は refusal で、許可かどうかの判定がありません。原稿をどう扱いますか。
<!-- kind: single; skills: claude-safety -->

- A. HTTP 200 が出たので配信する
- B. 原稿の冒頭に「確認済み」を付けてから配信する
- C. 自動配信を保留し、人の確認に回す
- D. 判定を得られなかった原稿だけを本処理に渡し、配信後に監査対象として別に記録する

<details>
<summary>解答</summary>

**C** — 確認を通過させるには明示的な許可が必要です。refusal は判定が得られなかったことを示すので、原稿を不適切と断定する必要もありません。（範囲 D7 Security and Safety。復習 7-1-2・Mitigate jailbreaks and prompt injections）

</details>

### Q20. 非ストリーミングの 2 件を比べます。依頼甲は HTTP 200、stop_reason が refusal。依頼乙は HTTP 529 です。利用者に返す結果と再試行をどう分けますか。
<!-- kind: single; skills: claude-stop-reason -->

- A. 両方とも設定した回数まで、同じ内容で自動再試行する
- B. 甲は拒否を通知し、乙だけ期限内に再試行する
- C. 甲は出力の上限を増やして再試行し、乙は拒否を伝える
- D. 甲と乙の両方を通信障害として記録し、次回は出力トークンの上限を増やして再送する

<details>
<summary>解答</summary>

**B** — 甲では API から完了した応答があり、モデルの停止理由を扱います。乙はサービスの過負荷です。HTTP ステータスと stop_reason を別々に見ると対応を選べます。（範囲 D2 Applications and Integration。復習 1-3-3・Refusals and fallback / Stop reasons and fallback）

</details>

### Q21. 通常の振り分けは安価なモデルで足ります。例外時だけ高度な判断を問い合わせ、得た助言を使って元のモデルに処理を完了させたいとき、どの構成を試しますか。
<!-- kind: single; skills: claude-model-selection -->

- A. 常に高性能モデルを親にして、通常例もすべてそこから割り振る
- B. 通常の処理を担当するモデルから、難しい箇所だけ高性能なモデルに助言を求める
- C. 同じ安価なモデルを非同期バッチにして、翌日に全件を採点する
- D. 例外の作業全体を高性能モデルへ引き渡す

<details>
<summary>解答</summary>

**B** — 主な仕事が通常のモデルで終わる場合、例外だけを相談すれば追加費用の対象を絞れます。効果は例外の正答数と、助言を呼ぶ回数を記録して確かめます。（範囲 D5 Model Selection and Optimization。復習 3-1-4・Optimizing for cost and intelligence）

</details>

### Q22. 修理票を構造化出力で受け取ると、JSON の形はすべて正しいのに、台帳に存在しない機器 ID が混じりました。台帳は毎日更新されます。登録前に何を足しますか。
<!-- kind: single; skills: claude-structured-output -->

- A. 厳密な JSON の例をもう 1 件足す
- B. 抽出した ID を登録前に現行台帳と照合する
- C. 出力の最大トークン数を増やし、検査を省く
- D. JSON の機器 ID に命名規則のパターンを適用し、一致した文字列は登録済みとみなす

<details>
<summary>解答</summary>

**B** — スキーマに沿った文字列でも、実在する機器を指すとは限りません。台帳にあることは、受け取り側が実データと照合して確認できます。（範囲 D6 Prompt and Context Engineering。復習 4-2-1・Structured outputs）

</details>

### Q23. 同じ問い合わせで、Anthropic 提供のウェブ検索と、自社が定義した在庫照会を使います。応答に自社の在庫照会の tool_use がありました。どこが何を実行しますか。
<!-- kind: single; skills: claude-tool-use -->

- A. 検索と在庫照会をどちらもアプリで実行し直す
- B. 検索の結果が応答にあるので、在庫照会も実行済みとして表示する
- C. 自社の在庫照会だけをアプリで実行して返す
- D. クライアントツールの実行記録はウェブ検索の結果ブロックで代用し、在庫照会の入力を同じ検索語としてもう一度検索する

<details>
<summary>解答</summary>

**C** — ツールの種類で実行元が変わります。自社の在庫照会の tool_use は要求を表すので、実行せずに結果を確定することはできません。（範囲 D8 Tools and MCP。復習 5-1-4・Tool use with Claude / Handle tool calls）

</details>

### Q24. 受付の分類先は配送・請求の 2 種です。請求のケースだけが請求照会ツールを使えます。分類の出力に未知の値が混じることもあります。どの実装が適切ですか。
<!-- kind: single; skills: claude-workflows -->

- A. 分類結果をツール名としてそのまま実行する
- B. 許可した分類だけを振り分け、未知なら確認に回す
- C. すべての依頼に両方のツールを渡し、分類結果を回答に添える
- D. 分類器に数値の確信度を追加し、高ければ未知の値も後続のツール名に変換して実行する

<details>
<summary>解答</summary>

**B** — 分類から実行先への対応はコード側で決められます。未知の値を分けて扱うと、想定外の分類を請求処理に通さずに済みます。（範囲 D1 Agents and Workflows。復習 6-2-2・Building effective agents）

</details>

### Q25. 同じ日に HTTP 400（入力形式が不正）、401（認証失敗）、429（レート制限）、529（過負荷）が記録されました。リクエスト内容や資格情報を変えずに、待って再試行する候補を 2 つ選んでください。
<!-- kind: multiple; skills: claude-api-errors -->

- A. 400
- B. 401
- C. 429
- D. 529

<details>
<summary>解答</summary>

**C, D** — 送信量やサーバー負荷は時間とともに変わります。入力の形式や資格情報に問題がある場合は、原因を直してから送ります。再試行は回数や期限を決めて行います。（範囲 D2 Applications and Integration。復習 2-1-1・Claude API errors）

</details>

### Q26. 問い合わせの処理期限まであと 4 秒です。API が 429 と retry-after: 10 を返しました。期限後に届く応答は破棄する契約です。次に何をしますか。
<!-- kind: single; skills: claude-api-errors -->

- A. 4 秒ぎりぎりまで毎秒再試行する
- B. 10 秒後に自動で再試行し、結果だけ破棄する
- C. この依頼を打ち切り、再依頼を案内する
- D. 即時のリクエストだけを別ワーカーへ引き継ぎ、同じレート制限下で 4 秒以内に結果が返るまで再試行する

<details>
<summary>解答</summary>

**C** — 再試行可能になるのは処理期限の後です。待機時間と期限を照合すれば、使われない応答への課金と再試行の集中を防げます。（範囲 D2 Applications and Integration。復習 2-1-2・Claude API errors / Rate limits / TypeScript SDK）

</details>

### Q27. 同じモデルで 5 分以内に 200 回問い合わせます。手引きはキャッシュに必要な長さを満たしています。部署ごとに異なる質問を送りつつ、同じ手引きの読み込み費用を抑える方法はどれですか。
<!-- kind: single; skills: claude-prompt-caching -->

- A. 問い合わせの到着時刻を先頭へ足し、その後ろの手引きをキャッシュする
- B. 共通の手引きまでを同じ並びでキャッシュし、部署ごとの質問を後ろへ置く
- C. 過去の回答をキャッシュして、部署だけを差し替えて利用者に返す
- D. 毎回、質問を含めた入力全体に区切りを置く

<details>
<summary>解答</summary>

**B** — キャッシュは一致する入力の先頭部分を再利用します。手引きより前に可変な値を入れると、その値より後ろの入力まで同じ接頭部として扱えません。（範囲 D5 Model Selection and Optimization。復習 3-2-1・Prompt caching）

</details>

### Q28. 固定の 40 件でプロンプトを比較しました。通常の 30 件は旧版 27・新版 30 件正解、根拠不足の 10 件は旧版 9・新版 6 件正解です。運用条件は根拠不足の正解が 8 件以上です。どの判断が妥当ですか。
<!-- kind: single; skills: claude-evals -->

- A. 全体の正解数が同じなので新版をそのまま採用する
- B. 通常の正解率が上がったので根拠不足の例を評価から外す
- C. 採用を保留し、根拠不足で外した例を調べる
- D. 評価セット全体で正解数の減少がなければ配備し、根拠不足の 10 件に限っては配備後に追加評価する

<details>
<summary>解答</summary>

**C** — どちらも全体では 36/40 です。ただし新版は根拠不足の群で 6/10 に落ち、採用条件に届きません。該当する入力の出力を見比べると、直すべき失敗を絞れます。（範囲 D4 Eval, Testing, and Debugging。復習 8-2-1・8-2-2・Define success criteria and build evaluations）

</details>

### Q29. 100 件のうち 1 件だけ HTTP 500 になり、サポート担当が該当リクエストを照合したいと言っています。問い合わせ本文には個人情報があります。最初に何を渡しますか。
<!-- kind: single; skills: claude-api-errors, claude-evals -->

- A. 生の会話と API キーを合わせたデバッグログ
- B. 失敗した呼び出しの request-id と発生時刻、HTTP ステータス
- C. 同じ入力で再実行して得た、成功した別リクエストの id
- D. 発生時刻と成功した前後 2 件の request-id だけを報告し、失敗した 1 件については本文で照合する

<details>
<summary>解答</summary>

**B** — request-id は個々の呼び出しを識別します。再実行では別の id になるため、障害の起きた呼び出しの記録を使います。（範囲 D4 Eval, Testing, and Debugging。復習 2-1-3・Claude API errors）

</details>

### Q30. 回答の草案作成と、入力を自動回答してよいかの判定は、どちらも同じ依頼だけを読みます。表示までの待ち時間を短くし、許可が出るまで草案を利用者に見せない構成を選んでください。
<!-- kind: single; skills: claude-workflows -->

- A. 草案を生成しながら先に表示し、判定で拒否されたら後から消す
- B. 2 件を並列に実行し、両方の結果がそろって許可が出た場合だけ回答を表示する
- C. 回答を 2 回生成して一致すれば、別の判定を待たずに表示する
- D. 草案の生成は待たずに終え、生成が完了した時点で許可判定の処理を取り消してその草案を表示する

<details>
<summary>解答</summary>

**B** — 2 件は互いの結果を必要としないので並列に実行できます。表示は判定結果に依存します。生成と表示を分けてこの条件を守ります。（範囲 D1 Agents and Workflows。復習 6-2-3・Building effective agents）

</details>

### Q31. 構造化出力を使う抽出で、HTTP 200 の応答をすべて保存しています。利用者が処理を断られた場合まで JSON の解析エラーとして記録されています。最初に直す分岐はどれですか。
<!-- kind: single; skills: claude-structured-output -->

- A. request-id の有無で抽出の成否を分ける
- B. 出力トークン数が 0 より大きければ、すべて構造化データとして読む
- C. 停止理由で拒否と打ち切りを分け、完成した出力だけを JSON として読む
- D. 整形式の JSON が返った場合だけ stop_reason を記録する

<details>
<summary>解答</summary>

**C** — 拒否や出力上限による中断では、期待した JSON がそろうとは限りません。停止理由を先に残すと、業務上の拒否と出力の打ち切りを区別できます。（範囲 D6 Prompt and Context Engineering。復習 4-2-2・Structured outputs）

</details>

### Q32. 社内検索ツールの limit に文字列が入って呼び出しが失敗しました。検索が必要なときにだけツールを使い、呼ぶときは limit を整数にしたいです。どこに制約を書きますか。
<!-- kind: single; skills: claude-tool-design -->

- A. 最終回答の JSON スキーマに limit が整数と書く
- B. ツールの input_schema で整数型を指定し、strict を有効にする
- C. tool_choice で毎回検索を指定し、limit の型は説明文にだけ書く
- D. 最終回答のスキーマに整数の limit と検索結果を定義し、検索ツールに渡った引数も同じ型だとみなす

<details>
<summary>解答</summary>

**B** — 制約をかけたいのは回答文ではなくツールの引数です。ツールを必ず呼ばせるかどうかは別に決められます。（範囲 D8 Tools and MCP。復習 5-2-2・5-2-3・Define tools / Strict tool use / Tool use with Claude）

</details>

### Q33. 固定の手引きをキャッシュするよう変更しました。1 回目も 2 回目も cache_creation_input_tokens が大きく、cache_read_input_tokens は 0 です。2 回とも同じモデルで、送信間隔は 1 分。入力は「時刻→手引き→質問」です。どこを直しますか。
<!-- kind: single; skills: claude-prompt-caching -->

- A. キャッシュの区切りを時刻の直後に移す
- B. 固定の手引きを前、時刻を後に置く
- C. 回答を短くしてキャッシュの読み込み枠を空ける
- D. 質問も毎回同じ長さに整え、時刻から手引きまで含めて同じトークン数になるよう空白を足す

<details>
<summary>解答</summary>

**B** — 書き込みが起きているので、まず区切りまでの差を調べます。毎回変わる時刻を先頭に置くと、その後ろの手引きが同じでも先頭からの一致が途切れます。（範囲 D5 Model Selection and Optimization。復習 3-2-2・Prompt caching）

</details>

### Q34. ほぼ同じ件数を送っているのに、長い相談が増えた日だけ 429 が増えました。どの制限に達したかを調べるために、最初に何を記録しますか。
<!-- kind: single; skills: claude-api-errors -->

- A. 成功・失敗ごとの HTTP ステータスだけを数える
- B. API 応答のレート制限ヘッダーで、リクエスト数と入力・出力トークンの残量を確かめる
- C. 応答の stop_reason の種類だけを数える
- D. 出力の最大長と実際の出力の比を集計する

<details>
<summary>解答</summary>

**B** — 件数が同じでも、相談が長ければ使うトークンは増えます。どの枠の残りが減ったかを時刻とともに記録すれば、送る量を調整できます。（範囲 D2 Applications and Integration。復習 2-1-4・Rate limits）

</details>

### Q35. 無人の文書調査ではファイルの読み取りと文字列の検索だけを認めます。担当者は「これだけ使って」とプロンプトに書きました。実行環境の権限も業務の範囲に収める案はどれですか。
<!-- kind: single; skills: claude-safety -->

- A. 編集やコマンド実行も用意し、使われたら次回のプロンプトを直す
- B. ツールを Read と Grep に限定し、読み取り用のファイル権限で動かす
- C. すべての操作を事前許可し、完了後のログで使ったツールを点検する
- D. Read と Grep を許可一覧に載せ、編集やコマンド実行の可否は確認を省略する無人実行モードに一任する

<details>
<summary>解答</summary>

**B** — 指示違反が一度あっても書き換えが起きない構成にします。提供するツールと、プロセスに与えるファイル権限の両方を点検します。（範囲 D7 Security and Safety。復習 7-1-3・Configure permissions）

</details>

### Q36. チャットの完了までは平均 8 秒です。品質を保ったまま読み始めを早くしたい一方、通信が切れた文章は完了した回答として保存できません。どの受け取り方を選びますか。
<!-- kind: single; skills: claude-streaming -->

- A. 全文を受け取ってから、文字を少しずつ画面に描く
- B. 届いたテキストを表示し、正常終了したときだけ完成した回答として保存する
- C. 先頭のテキストが届いた時点で完了を記録し、残りは届けば追加する
- D. 最初の text_delta で回答のレコードを完了にして、通信が閉じるまでに届いた文字をそこへ順次追記する

<details>
<summary>解答</summary>

**B** — 読み始めるまでの時間と、全文が確定する時点は違います。途中の表示を許しつつ、切断・エラーなら完了記録を残さない設計にします。（範囲 D2 Applications and Integration。復習 2-2-1・Streaming messages / Claude API errors）

</details>

### Q37. 製品ごとに障害報告を調査します。最初のログを見るまで、追加調査が必要な製品も件数も分かりません。件数が変わっても担当を分け、証拠を集約したいときはどの方式を選びますか。
<!-- kind: single; skills: claude-workflows -->

- A. 開始前に決めた 2 件の固定作業を、毎回同じ順に実行する
- B. 同じ依頼を数人に渡し、一番多い答えを選ぶ
- C. ログを見て調査を分担し、結果を集める
- D. 最初のログを見る前に決めた担当割りを実行し、そのとき対象外だった製品のログは調査の範囲から外す

<details>
<summary>解答</summary>

**C** — 判断材料は実行中に得られます。全体を担当する処理がその材料から必要な作業を決めると、対象の製品だけを別々に調査できます。（範囲 D1 Agents and Workflows。復習 6-2-4・Building effective agents）

</details>

### Q38. 同じ短い指示を 1 分間に 50 回送り、毎回 cache_read_input_tokens も cache_creation_input_tokens も 0 です。cache_control は固定部分の末尾にあります。最初に確かめることはどれですか。
<!-- kind: single; skills: claude-prompt-caching -->

- A. 区切りまでのトークン数が、そのモデルの最小キャッシュ長を満たすか
- B. 生成した出力トークン数が、固定の入力より長いか
- C. 後続の質問の文字列が 50 回とも同じか
- D. 出力予定量も含めた合計が最小キャッシュ長を超えるか

<details>
<summary>解答</summary>

**A** — 一度も書き込まれていないので、先にキャッシュを作れる長さかを確かめます。区切りより後ろに別の質問が来ても、固定部分の再利用はできます。（範囲 D5 Model Selection and Optimization。復習 3-2-3・Prompt caching）

</details>

### Q39. ストリーミングで本文が届き続け、まだ stop_reason が分かりません。上限で切れた場合と正常な終了を区別したいです。何を見ますか。
<!-- kind: single; skills: claude-streaming -->

- A. 先頭の text_delta の最後の文字
- B. 終盤の message_delta の stop_reason を読み、正常終了も確認する
- C. 最初に HTTP 200 を受けた時刻
- D. 文字列を最後に追加した content_block_stop を調べ、それを今回の応答全体の stop_reason として記録する

<details>
<summary>解答</summary>

**B** — 本文の区切りは回答の完了を表しません。終盤の停止理由を保存して、通信が途中で切れた場合も別の状態として扱います。（範囲 D2 Applications and Integration。復習 2-2-2・Streaming messages）

</details>

### Q40. 説明書の先頭部分はキャッシュで毎回読み込めています。それでも新しい質問を足すとモデルの枠を超えました。枠の見積もりを直す方法を 2 つ選んでください。
<!-- kind: multiple; skills: claude-context-management -->

- A. キャッシュから読んだ入力も、今回のコンテキストに含める
- B. キャッシュが当たった入力は、会話の長さから引く
- C. ツール定義や履歴を含む入力を数え、今回生成する出力の余地を取る
- D. 課金された金額を最大トークン数に換算して、残りを決める

<details>
<summary>解答</summary>

**A, C** — キャッシュで同じ入力の処理を再利用しても、その内容をモデルが使うことは変わりません。入力全体と必要な出力を合わせて枠を見積もります。（範囲 D6 Prompt and Context Engineering。復習 4-3-1・Context windows）

</details>

### Q41. 利用者は注文番号で到着日を調べたいだけですが、ツール一覧には顧客・注文・倉庫の各テーブルの汎用検索が並び、倉庫ばかり検索しています。最初に試す改善はどれですか。
<!-- kind: single; skills: claude-tool-design -->

- A. 汎用検索をさらに小さく分けて、選べる関数を増やす
- B. 注文番号を受けて到着日を返すツールを用意し、他の検索と使い分ける条件を説明に書く
- C. 成功率の低いツールも名前を短くして、説明を全部同じにする
- D. 検索ツールをテーブルごとに残したまま、倉庫の検索を先頭へ移し、例も倉庫の成功例だけにそろえる

<details>
<summary>解答</summary>

**B** — 利用者の仕事とツールの粒度が合っていません。必要な照会をまとめて用途をはっきりさせると、選び間違いが減るかを同じ依頼で再評価できます。（範囲 D8 Tools and MCP。復習 5-2-1・5-2-4・Define tools / Writing effective tools for agents）

</details>

### Q42. コードを整形するフックが作者の端末だけで動きます。チームの全員が同じリポジトリを取得して使う前提で、版管理する場所を選んでください。
<!-- kind: single; skills: claude-code-config -->

- A. 各人のホームディレクトリの .claude/settings.json
- B. リポジトリの .claude/settings.json とフックスクリプト
- C. リポジトリの .claude/settings.local.json だけ
- D. フックのスクリプトだけをリポジトリに入れ、登録する設定は全員が同じ名前のユーザー設定を持つ前提にする

<details>
<summary>解答</summary>

**B** — 個人設定やローカル用の上書きでは、チーム全員が同じ定義を取得できません。共有するフックとその実装を一緒に版管理します。（範囲 D3 Claude Code。復習 8-1-3・Settings files and precedence / Automate actions with hooks）

</details>

### Q43. 10 万件の過去アンケートを分類します。結果が数時間後でもよく、24 時間以内に完了しなかった分は翌日処理し直せます。同じ窓口には即時応答が必要な新着相談もあります。どれを選びますか。
<!-- kind: single; skills: claude-batches -->

- A. すべて同じバッチに入れ、新着だけ先に結果を表示する
- B. 過去分は上限内の Message Batches、新着は同期の Messages API で処理する
- C. 過去分も新着も同期にし、過去分の送信を最優先する
- D. 新着だけを短いバッチに分け、応答を待つ

<details>
<summary>解答</summary>

**B** — 過去分は非同期処理を待てます。バッチの完了時刻には幅があるため、新着への即時応答は別経路で維持します。（範囲 D2 Applications and Integration。復習 2-3-1・2-3-2・Batch processing）

</details>

### Q44. 親エージェントが同名のログを 3 製品分調べました。担当を 1 製品だけに絞ったサブエージェントに、別の製品を取り違えず原因調査を任せたいです。何を渡しますか。
<!-- kind: single; skills: claude-agent-sdk -->

- A. 担当者が親の過去の会話を読めると仮定し、「調べて」だけを渡す
- B. 対象製品・時刻・根拠・期待する報告を明記する
- C. 同名のログがあることだけ伝え、対象製品は担当に選ばせる
- D. 3 製品のログの保存先をすべて渡し、どの製品を担当するかはデータ件数が最も多いものに決めさせる

<details>
<summary>解答</summary>

**B** — 担当は親とは別のコンテキストで作業します。対象と根拠を明示すると、同じ名前の別ファイルを使った報告を避けられます。（範囲 D1 Agents and Workflows。復習 6-3-2・Subagents in the SDK）

</details>

### Q45. 処理対象にツール定義と長文を追加し、モデルも変更します。入力が上限に近いため、実行前に見積もります。適切な手順を 2 つ選んでください。
<!-- kind: multiple; skills: claude-token-cost -->

- A. 本番で使うモデルと、実際に渡すメッセージ・ツール定義を指定して数える
- B. 旧モデルでユーザー本文だけ数えた値を、そのまま上限判定に使う
- C. 出力に必要な余裕も見込み、実行後に usage の実測値を確認する
- D. 文字数を 4 で割った値と完全に一致したら送る

<details>
<summary>解答</summary>

**A, C** — 入力には本文以外の定義も含まれ、モデルによって数え方が異なる場合があります。見積もりには余裕を持たせ、実際に使ったトークン数と突き合わせます。（範囲 D5 Model Selection and Optimization。復習 3-3-1・Token counting）

</details>

### Q46. アンケート 100 件をバッチに入れました。出力の先頭は入力の 87 件目で、1 件だけ処理が失敗しています。元のアンケートに結果を結び、失敗分を特定する方法はどれですか。
<!-- kind: single; skills: claude-batches -->

- A. 結果の行番号を入力の行番号に結び、空いた番号を再送する
- B. 回答本文から元のアンケートを推測し、先頭から順に保存する
- C. custom_id で照合し、各結果の成否を調べる
- D. 入力を時刻順に並べて送り、同じ時刻順で返る前提で結果を照合し、エラー行だけを監視用の ID で保存する

<details>
<summary>解答</summary>

**C** — 結果の並びは入力順とは限りません。id で結べば途中の失敗も正しい対象に対応し、成功した項目を重ねて処理せずに済みます。（範囲 D2 Applications and Integration。復習 2-3-3・Batch processing）

</details>

### Q47. 検索で見つかった規程には正社員の手当額だけがあり、契約社員の金額は見つかりません。質問は契約社員の手当です。回答方針として採用するものを 2 つ選んでください。
<!-- kind: multiple; skills: claude-grounding -->

- A. 回答の根拠となる箇所を先に抜き出し、適用対象が契約社員かも確認する
- B. 正社員の金額を引用し、契約社員にも同額だと推定する
- C. 根拠が見つからなければ、対象が確認できないことを伝え、確認先へつなぐ
- D. もっともらしい金額を生成し、参考値として案内する

<details>
<summary>解答</summary>

**A, C** — 金額が引用できても、その規程の対象が質問と違えば根拠にはできません。適用対象も確認し、資料から決められないときに進む手順を用意します。（範囲 D7 Security and Safety。復習 7-2-1・7-2-2・Reduce hallucinations）

</details>

### Q48. 同じ手引き PDF を使う質問を 200 件処理します。ネットワーク計測では、PDF の再送がボトルネックです。対応する Claude API 環境で、アップロード回数を減らす方法はどれですか。
<!-- kind: single; skills: claude-files-and-media -->

- A. リクエストごとに PDF を Base64 に変換して送る
- B. Files API へ 1 回送信し、後続は document の source で file_id を指定する
- C. 最初の応答の id だけを後続に渡し、PDF を覚えているものとして質問する
- D. 固定の PDF を毎回 Base64 でリクエストに入れ、プロンプトキャッシュを付ければネットワーク転送も省略できると見込む

<details>
<summary>解答</summary>

**B** — 再利用するのはアップロード済みのファイルです。リクエストの本文から PDF の再送を省けます。入力トークンにかかる費用は別に見積もります。（範囲 D2 Applications and Integration。復習 2-4-1・Files API）

</details>

### Q49. 長いやり取りの前半で、依頼者が『振込先は変更しない』と決めました。会話を圧縮して調査を続けます。この制約を次の判断でも守るには、何を確認しますか。
<!-- kind: single; skills: claude-context-management -->

- A. 要約に制約と未解決の作業が残ったかを照合し、必要なら元の記録から補ってから続ける
- B. プロンプトキャッシュが当たれば要約の欠落は復元されるものとして進める
- C. 新しい会話を始め、短くなったことだけを確認する
- D. 圧縮前後のトークン数から制約が残ったか判断する

<details>
<summary>解答</summary>

**A** — 要約された文脈を使うと、元の発言の細部が省かれることがあります。残すべき条件を先に決めて照合し、必要な材料だけ再び渡します。（範囲 D6 Prompt and Context Engineering。復習 4-3-2・4-3-3・Compaction overview / Context windows / Effective context engineering for AI agents）

</details>

### Q50. 自社の検索用 MCP サーバーは開発者端末の stdio で動きます。別にリモートの HTTPS 接続先も用意しました。使う場所と接続方法の組み合わせで正しいものを 2 つ選んでください。
<!-- kind: multiple; skills: claude-mcp -->

- A. Messages API の MCP コネクターにローカルの起動コマンドを渡す
- B. ローカルでは Agent SDK の MCP 設定で stdio のプロセスを起動する
- C. Messages API の MCP コネクターには、到達可能な HTTPS の接続先を設定して利用するツールを指定する
- D. MCP コネクターに Files API の file_id を渡し、ローカルプロセスを特定する

<details>
<summary>解答</summary>

**B, C** — stdio は手元でプロセスを起動する接続です。Messages API からは到達できるリモートサーバーを指定します。接続元を先に決めると設定を選べます。（範囲 D8 Tools and MCP。復習 5-3-2・5-3-3・MCP connector / Connect to external tools with MCP）

</details>

### Q51. 資料調査の途中で Agent SDK が error_max_turns を返しました。今回の調査範囲は適切で、責任者は追加 3 ターンを認めています。すでに調べた資料を生かすにはどうしますか。
<!-- kind: single; skills: claude-agent-sdk -->

- A. error_max_turns の result を完成した調査結果として配る
- B. 同じ依頼で新規セッションを作り、調査した資料は推測して補う
- C. session_id で再開し、追加ターン数を制限する
- D. 同じプロンプトを新規セッションで送り、直前の ResultMessage の subtype だけを追加の状況説明として渡す

<details>
<summary>解答</summary>

**C** — 上限で止まった結果は完成報告ではありません。既存のセッションを再開すれば、作業の手がかりを保ったまま、追加の調査にも上限を設けられます。（範囲 D1 Agents and Workflows。復習 6-3-1・6-3-3・How the agent loop works / Work with sessions）

</details>

### Q52. 相談窓口では、全文を読み終えるまでの時間と、最初の文字が見えるまでの時間を別々に測っています。モデルを変えず、必要な内容も落とさずに改善を試せる方法を 2 つ選んでください。
<!-- kind: multiple; skills: claude-model-selection -->

- A. 生成中のテキストをストリーミングで順に表示する
- B. 回答に必要な項目を明記し、毎回付いていた不要な長い前置きを省く
- C. 応答が完成するまでサーバーにため、後から一文字ずつ表示する
- D. 全依頼で effort を最大に固定し、比較の計測を省く

<details>
<summary>解答</summary>

**A, B** — ストリーミングなら全文がそろう前に読み始められます。必要な項目を保ったまま生成する文字量を減らすと、完了までの時間も短くできるかを測れます。（範囲 D5 Model Selection and Optimization。復習 3-3-2・3-3-3・Reducing latency / Thinking / Effort）

</details>

### Q53. 修理票 1 枚の写真と、複数ページの取扱説明書 PDF を同時に照合します。対応するモデルで、元の図や表を保ったまま入力を作る方法はどれですか。
<!-- kind: single; skills: claude-files-and-media -->

- A. 両方を text に入れ、ファイル名を付けて送る
- B. PDF の全ページを連結した値を 1 つの image として送る
- C. 写真は image、PDF は document にする
- D. 写真と PDF を同じ document の中にまとめ、単一の source に含めれば入力形式の違いも読み分けられると考える

<details>
<summary>解答</summary>

**C** — 写真と PDF では対応するコンテンツブロックが違います。どの資料を比較するかを質問文に添えると、複数の資料を同じ依頼に含められます。（範囲 D2 Applications and Integration。復習 2-4-2・PDF support / Vision）

</details>

### Q54. 修理申請の照会で、エージェントが同じ検索語で 3 回続けて 0 件を返しました。依頼者は製品名しか知らず、追加調査の上限は 3 回です。今の実行をどう終えますか。
<!-- kind: single; skills: claude-agent-sdk -->

- A. ツールをもう 1 回呼び、よい答えが出るまで上限を伸ばす
- B. 検索を止め、別の識別情報を依頼する
- C. 0 件だったので修理申請そのものが存在しないと断定する
- D. 同じ検索が 3 回失敗した事実から製品名の誤りと結論し、申請が見つからなかった理由をそのまま利用者に伝える

<details>
<summary>解答</summary>

**B** — 手元の条件で見つけられなかったことと、申請が存在しないことは別です。上限で試行を終え、次に結果が変わり得る情報を依頼します。（範囲 D1 Agents and Workflows。復習 6-3-1・How the agent loop works）

</details>

### Q55. チームの障害報告は、担当者が依頼したときだけ決まった手順で作ります。手順は 3 ページあり、通常の作業にも毎回読み込ませる必要はありません。どう共有しますか。
<!-- kind: single; skills: claude-code-config -->

- A. CLAUDE.md に手順を全文貼り、どの会話にも読み込む
- B. 呼び出して使うプロジェクトスキルの SKILL.md に手順をまとめる
- C. ファイルを書くたびに障害報告を作るフックを登録する
- D. 起動のたびにフックで障害報告の手順を読み込む

<details>
<summary>解答</summary>

**B** — 特定の仕事にだけ使う手順はスキルとして用意できます。常時使う簡潔な指示と分けると、無関係な作業の文脈に長い手順を入れずに済みます。（範囲 D3 Claude Code。復習 8-1（まとめ）・Extend Claude with skills）

</details>

### Q56. 回答を採点するモデルは正答率 95% と報告しました。しかし人が確認すると、根拠のない返金案内を合格にしています。自動採点を採用する前に何をしますか。
<!-- kind: single; skills: claude-evals -->

- A. 採点モデルを大型に変え、以前の採点結果をすべて正解として扱う
- B. 人が判定した合格例と不合格例で突き合わせ、誤って通した例を見て基準を修正し、別の例で再確認する
- C. 採点用の指示に「厳しく」と加え、合格件数の少なさを基準にする
- D. 人と食い違った出力だけを使って判定基準を細かく書き直し、その同じ出力で一致率が上がれば本番に切り替える

<details>
<summary>解答</summary>

**B** — 採点器自体にも誤りがあります。人の判定と食い違った具体例から基準の曖昧さを見つけ、直すときに使わなかった例で確かめます。（範囲 D4 Eval, Testing, and Debugging。復習 8-2-4・Define success criteria and build evaluations）

</details>

### Q57. 修理費を抽出するプロンプトを直します。値が空欄の伝票で、存在しない 0 円が返ります。正当な無償修理の 0 円は残す必要があります。指示に何を加えますか。
<!-- kind: single; skills: claude-prompt-design -->

- A. 金額は必須と伝え、空欄を 0 に正規化する
- B. 未記入は null、明記した 0 円は 0 と例示する
- C. 応答をすべて文字列にして、画面で空欄も 0 円と表示する
- D. 金額がない入力には無償のラベルを付けて 0 円を返し、記入があったかは別の呼び出しで推測させる

<details>
<summary>解答</summary>

**B** — 「未記入」と「記載された 0 円」は意味が違います。境目を定義し、片方ずつ例で示すと、必要な区別を失わずに抽出できます。（範囲 D6 Prompt and Context Engineering。復習 4-1-2・Prompting best practices）

</details>

### Q58. 障害の再現に必要なのは、停止理由と、ツールがどの順で呼ばれたかです。問い合わせ本文には氏名と連絡先があります。運用ログには何を残しますか。
<!-- kind: single; skills: claude-safety -->

- A. 全リクエストと全レスポンスを保存し、閲覧者に注意を促す
- B. request-id と停止理由、ツール名と成否を残す
- C. 氏名だけを伏せて、連絡先と認証ヘッダーはそのまま残す
- D. 記録をすべて暗号化できるので、生の問い合わせ本文と認証情報をエラーごとに保存し、停止理由は後から推定する

<details>
<summary>解答</summary>

**B** — 原因の調査に必要な情報を先に決めれば、個人情報や認証情報をログへ広げずに処理の経路を追えます。（範囲 D7 Security and Safety。復習 7-2-3・2-1-3・Claude API errors）

</details>

### Q59. 報告書を改善するため、草案を作る処理と採点する処理を組み合わせます。未記載の項目名を採点側が具体的に指摘でき、修正は 2 回までです。どの流れにしますか。
<!-- kind: single; skills: claude-workflows -->

- A. 本文が長くなれば改善とみなし、2 回とも無条件に書き直す
- B. 不足項目を返して草案を直し、合格か修正の上限で止める
- C. 採点より前に同じ草案を 2 回生成し、後に得たほうを採用する
- D. 評価役の点数を 1 回記録し、草案の書き直しは前回の具体的な指摘を渡さずにもう一度同じ依頼で行う

<details>
<summary>解答</summary>

**B** — 採点結果が次の修正に使えるので、評価役と生成役を分ける価値があります。合格時と上限到達時の両方の終了条件をあらかじめ決めます。（範囲 D1 Agents and Workflows。復習 6-2-5・Building effective agents）

</details>

### Q60. 部署をまたぐ 4 つのリポジトリに、同じレビュー用スキル、フック、MCP 設定を配ります。担当者はこれらを 1 単位で更新したいと言っています。どう配布しますか。
<!-- kind: single; skills: claude-code-config -->

- A. どれか 1 つのリポジトリの CLAUDE.md に設定を文章でまとめ、各人に手入力してもらう
- B. 各リポジトリに別の名前でコピーし、それぞれ独立に更新する
- C. スキル・フック・MCP 設定をまとめたプラグインを配布する
- D. 構成を共通の SKILL.md に文章として書き、スキルを各リポジトリにコピーするとフックと MCP 設定も読み込まれると見込む

<details>
<summary>解答</summary>

**C** — プラグインはスキルやフック、MCP サーバーの定義をまとめて配れます。どの版を使っているかを記録すると、複数のリポジトリで更新を追えます。（範囲 D3 Claude Code。復習 8-1（まとめ）・Plugins overview）

</details>

### Q61. エージェントが『受付票を作成しました』と回答しました。実行結果に受付票を 1 件だけ保存することが合格条件です。評価用の環境で自動採点するなら、何を確認しますか。
<!-- kind: single; skills: claude-evals -->

- A. 回答に「作成しました」の文字が含まれるか
- B. ツールを呼んだ回数が必ず 1 回だったか
- C. 実行後の台帳で、期待する依頼者と内容の受付票が 1 件だけ作成されたか
- D. ツール引数と回答の受付番号が一致するか

<details>
<summary>解答</summary>

**C** — 回答文もツールの呼び出し回数も、保存結果を保証しません。求めた結果を評価環境で直接検査すれば、重複した作成も見つけられます。（範囲 D4 Eval, Testing, and Debugging。復習 8-2-1・Define success criteria and build evaluations）

</details>

### Q62. 出力規則は『要点を 2 文、その後に根拠を 1 件』です。プロンプトには禁則をいくつも並べましたが、毎回答えの形が変わります。次に試す修正はどれですか。
<!-- kind: single; skills: claude-prompt-design -->

- A. 禁止したい形をさらに 10 個追加する
- B. 求める構成を明記し、その形の短い例を添える
- C. 出力の上限を 2 文ぶんに減らし、根拠を付けるかはモデルに任せる
- D. 要点を 2 文に制限する指示だけを残し、根拠の件数と位置は以前の多数の回答から推測させる

<details>
<summary>解答</summary>

**B** — どの形にするかと、その具体例を示すと、評価する条件と指示が一致します。文字量を減らすだけでは根拠の項目を残せません。（範囲 D6 Prompt and Context Engineering。復習 4-2-3・4-1-2・Prompting best practices）

</details>

### Q63. 規程の照会で、回答には根拠の文と節番号を付けています。点検すると、引用文は正確でも失効した旧版でした。次に加える確認はどれですか。
<!-- kind: single; skills: claude-grounding -->

- A. 引用を 1 文から 3 文に増やす
- B. 依頼の対象日と施行日・失効日を照合し、有効な版で裏付けられなければ案内を保留する
- C. 引用の確信度をモデルに数字で書かせ、その数字だけを採用条件にする
- D. 別モデルが引用と回答の一致を認めるかを調べる

<details>
<summary>解答</summary>

**B** — 実在する引用でも、時点が合わなければ根拠になりません。日付や版を記録すると、どの規程を適用したか後から確認できます。（範囲 D7 Security and Safety。復習 7-2-1・7-2-2・Reduce hallucinations）

</details>

### Q64. 製品資料の調査を 3 人のサブエージェントに任せます。2 人の結論が矛盾し、どちらが最新の資料を見たのか分かりません。集約する前に、どんな返却形式を決めますか。
<!-- kind: single; skills: claude-agent-sdk -->

- A. 結論の多数決ができるよう、賛成か反対だけ返す
- B. 全員の作業ログを連結し、結論は最も長いログから選ぶ
- C. 各結論に資料名・版・該当箇所と未確認事項を添え、親が矛盾する根拠を突き合わせる
- D. 全担当に要約の長さだけをそろえてもらい、根拠の版を突き合わせる作業は各担当の内部に任せる

<details>
<summary>解答</summary>

**C** — サブエージェントの結果をまとめるには、主張と出所の対応が必要です。古い資料と適用範囲の違いも、根拠があれば区別できます。（範囲 D1 Agents and Workflows。復習 6-3-2・Subagents in the SDK）

</details>

### Q65. 夜間の CI で差分のレビュー結果を取り込みます。対話する人はいません。標準出力は別のプログラムが読み、変更を書き込む必要はありません。どの構成が合いますか。
<!-- kind: single; skills: claude-code-config -->

- A. 通常の対話画面を起動し、画面上の最終行を結果として読む
- B. 非対話の claude -p で、読み取りに必要なツールに限り、JSON と成否を読む
- C. 対話確認をなくすため書き込みまで一律に許可し、自然文の途中を成功として読む
- D. 非対話の claude -p で自然文を生成し、本文に『問題なし』を含めばレビュー完了として記録し、終了状態は無視する

<details>
<summary>解答</summary>

**B** — 無人実行には非対話モード、プログラムへの受け渡しには機械が読める出力が使えます。レビューに不要な変更権限を付ける理由はありません。（範囲 D3 Claude Code。復習 8-1（まとめ）・Run Claude Code programmatically）

</details>

### Q66. 要約の不具合を調べています。旧版からプロンプト、モデル、検索条件を同時に変えた後、正解数が減りました。どの変更が効いたかを切り分ける次の実験はどれですか。
<!-- kind: single; skills: claude-evals -->

- A. 新版を使って新しい入力だけを増やし、正解数の合計を旧版と比べる
- B. 同じ入力で旧版を基準に 1 か所ずつ変えて比べる
- C. 失敗例を除外してから 3 つの変更を同時にやり直す
- D. 同じモデルでプロンプトと検索条件をまとめて前の版に戻し、改善すれば片方だけが原因だったと結論づける

<details>
<summary>解答</summary>

**B** — 入力と基準を固定して変更箇所を減らすと、どの段階から誤りが生じたかを調べられます。複数の変更を組み合わせた場合だけの失敗も最後に確認します。（範囲 D4 Eval, Testing, and Debugging。復習 8-2-2・Define success criteria and build evaluations）

</details>

### Q67. 回答用のコンテキストに、同じ規程の古い下書きが 6 件と承認済みの現行版 1 件を入れています。モデルは古い案を選びがちです。先に変えるべき点はどれですか。
<!-- kind: single; skills: claude-context-management -->

- A. すべての下書きを残し、読み飛ばさないようそれぞれ 2 回載せる
- B. 出力の上限を増やし、全資料を詳しく比較してもらう
- C. 対象日と承認状態で根拠にできる資料を絞り、版と出所を添えて渡す
- D. 版の日付を外して 7 件を短い一覧に圧縮し、同じ結論を書いている資料の多さを現行版の判定に使う

<details>
<summary>解答</summary>

**C** — 古い案が混ざったままでは、回答を長くしても参照先の混同は解消しません。問いに使える根拠を選ぶところから直します。（範囲 D6 Prompt and Context Engineering。復習 4-3-2・Effective context engineering for AI agents）

</details>

### Q68. 検索用の MCP サーバーが、読み取りの search と、記録を更新する update を提供しています。このアプリの仕事は検索だけです。どの接続設定とツール設計が合いますか。
<!-- kind: single; skills: claude-mcp -->

- A. 両方とも公開し、更新を避ける指示をシステムプロンプトに書く
- B. 検索に必要なツールだけを許可し、サービス側の資格情報も読み取り用に限定する
- C. update を search_extra に改名し、選ばれにくくする
- D. クライアントの一覧から update を隠し、接続用の資格情報とサーバー側の更新権限は広いまま渡す

<details>
<summary>解答</summary>

**B** — 利用目的に合うツールを接続時に絞り、サービス側でも権限を確認します。名前の変更やプロンプトだけでは、許可された操作の範囲は変わりません。（範囲 D8 Tools and MCP。復習 5-3-2・7-1-3・MCP connector）

</details>

### Q69. FAQ の下書き生成に、検索・回答・採点の 3 段を導入しました。記録を見ると、情報が見つからなかった 20 件すべてで回答作成と採点まで動いていました。品質を保って無駄な呼び出しを減らす案はどれですか。
<!-- kind: single; skills: claude-workflows -->

- A. 採点を全件やめ、根拠がないときも必ず回答を作る
- B. 検索結果が空なら追加の情報を求めて終了し、根拠があるときだけ回答作成と採点に進む
- C. 検索前に回答を作り、結果が空なら回答に『推定』を付ける
- D. 検索が空なら別々に回答を生成し、多数決を取る

<details>
<summary>解答</summary>

**B** — 根拠の有無を中間結果で判定できます。答えを裏付ける資料がない場合の出口を設けると、その後の呼び出しを省けます。（範囲 D1 Agents and Workflows。復習 6-2-1・Building effective agents）

</details>

### Q70. チーム共通のテストコマンドと命名規則を、新しい Claude Code セッションでも参照したいです。規則の説明は短く、個人の設定と区別してコードレビューします。どこに書きますか。
<!-- kind: single; skills: claude-code-config -->

- A. 担当者の個人用メモに書き、時々チャットに貼る
- B. 毎回のツール実行を止めるフックに、命名規則をコメントとして書く
- C. チームの CLAUDE.md に書き、版管理する
- D. 個人用設定に同じ規則を貼り付け、誰かが命名規則を更新したときは各自が次回の作業時に個別に更新する

<details>
<summary>解答</summary>

**C** — CLAUDE.md はプロジェクトの指示をセッションに渡すのに使えます。命名を必ず検査したい場合は、別に lint などで検証できるようにします。（範囲 D3 Claude Code。復習 8-1-1・How Claude remembers your project）

</details>
