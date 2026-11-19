---
title: 予備演習（8領域・24問）
sourceRefs: [SRC-claude-developer-guide-v11-20261118, SRC-claude-docs-ts-sdk-20261031, SRC-claude-api-messages-create-20261031, SRC-claude-docs-errors-long-requests-20261031, SRC-claude-docs-context-windows-20261031, SRC-claude-docs-thinking-20261031, SRC-claude-docs-prompt-caching-20261031, SRC-claude-docs-caching-structure-20261031, SRC-anthropic-effective-agents-20261031, SRC-claude-code-agent-loop-control-20261031, SRC-claude-docs-prompting-20261031, SRC-anthropic-context-engineering-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-choice-20261031, SRC-claude-docs-define-tools-20261031, SRC-claude-docs-jailbreaks-20261031, SRC-claude-code-sdk-secure-deployment-20261031, SRC-claude-docs-hallucinations-20261031, SRC-claude-code-settings-20261031, SRC-claude-code-memory-20261031, SRC-claude-code-hooks-guide-20261031, SRC-claude-docs-evals-20261031, SRC-claude-docs-eval-grading-20261031, SRC-claude-docs-tool-troubleshooting-20261031]
---
## 知識問題

### Q1. 【D2・アプリ統合】受付画面で 429 が続きます。SDK の自動再試行は有効です。ログを見ると、同じ送信ボタンの処理がエラーを待ってから messages.create をさらに 2 回呼んでいました。混雑時の呼び出しを抑える修正はどれですか？
<!-- kind: single; skills: claude-sdk-setup, claude-api-errors -->

- A. SDK と画面の再試行をどちらも 1 回増やす
- B. SDK に回数の上限を渡し、使い切ったら画面で再度呼ばず、利用者に時間を置くよう案内する
- C. ボタンを押せなくして、バックグラウンドで同じ処理を成功まで続ける

<details>
<summary>解答</summary>

**B** — 二重に再試行すると、画面が create を呼ぶたびに SDK の再試行も始まります。ボタンを無効にするだけでは連打を防げても内部の呼び出しを制限できません。ログでは同じ操作からの create 回数を確かめます。(範囲: Applications and Integration。復習: 1-2-1・TypeScript SDK)

</details>

### Q2. 【D2・アプリ統合】max_tokens を 1024 にすると、入力と出力を合わせたトークン数が 1024 に収まります。
<!-- kind: boolean; skills: claude-messages-request -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — max_tokens は出力の上限です。入力と出力を合わせた量は、コンテキストウィンドウに収めます。(範囲: Applications and Integration。復習: 1-1-3・4-3-1・Messages(API reference))

</details>

### Q3. 【D2・アプリ統合】画面には出さない、max_tokens のとても大きいリクエストを送ります。送り方として適切なものはどれですか？
<!-- kind: single; skills: claude-streaming, claude-batches -->

- A. ストリーミングかバッチで送る
- B. 画面に出さないので、ストリーミングを使わずに 1 回で待つ
- C. max_tokens を小さくして、何度も送る

<details>
<summary>解答</summary>

**A** — 長く待つ通信は、途中のネットワークで切られることがあります。公式ドキュメントは、長いリクエストではストリーミングかバッチを使うよう案内しています。(範囲: Applications and Integration。復習: 2-2-1・Claude API errors の Long requests)

</details>

### Q4. 【D5・モデル選択と最適化】考える過程(thinking)のトークンは、max_tokens の上限に数えません。
<!-- kind: boolean; skills: claude-token-cost -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 考える過程も出力に数えるので、考える量が増えると答えに回る分が減り、答えが途中で切れることがあります。(範囲: Model Selection and Optimization。復習: 3-3-2・Thinking)

</details>

### Q5. 【D5・モデル選択と最適化】同じ十分に長い手引きを 2 件のリクエストで使います。通常の入力を 1 とし、同じ部分の 5 分キャッシュ書き込みを 1.25、読み取りを 0.10 とします。2 件目は有効時間内です。通常の 2 より安くできる配置はどれですか？
<!-- kind: single; skills: claude-prompt-caching, claude-token-cost -->

- A. 毎回違う問い合わせを手引きの前に置き、手引き末尾に区切りを置く
- B. 手引きだけをキャッシュに書き込み、問い合わせは翌日にまとめて送る
- C. 手引きを先頭に固定し、その末尾に区切りを置き、各問い合わせを後ろに足す

<details>
<summary>解答</summary>

**C** — 手引きを先頭に固定すると、同じ前半を再利用でき、ヒット時の手引き分は 1.25 + 0.10 = 1.35 です。問い合わせを前置きすると先頭から異なり、翌日に送ると書き込んだ内容が翌日まで保たれません。区切りと有効時間の両方が条件です。(範囲: Model Selection and Optimization。復習: 3-2-1・Prompt caching)

</details>

### Q6. 【D5・モデル選択と最適化】プロンプトキャッシュを使った応答で、入力のトークン数の合計を求める式として正しいものはどれですか？
<!-- kind: single; skills: claude-prompt-caching, claude-token-cost -->

- A. input_tokens だけ
- B. input_tokens + cache_creation_input_tokens + cache_read_input_tokens
- C. cache_read_input_tokens だけ

<details>
<summary>解答</summary>

**B** — input_tokens は、最後のキャッシュの区切りより後ろの部分だけです。(範囲: Model Selection and Optimization。復習: 3-2-3・Prompt caching)

</details>

### Q7. 【D1・エージェントとワークフロー】同じコードを、観点の違う複数のプロンプトで同時に調べ、結果を突き合わせて見落としを減らしたいです。向く形はどれですか？
<!-- kind: single; skills: claude-workflows -->

- A. プロンプトの連鎖
- B. 並列化
- C. ルーティング

<details>
<summary>解答</summary>

**B** — 互いに独立した処理は並べて同時に行います。同じ仕事を何度か行って結果を比べる形を、投票と呼びます。(範囲: Agents and Workflows。復習: 6-2-3・Building effective agents)

</details>

### Q8. 【D1・エージェントとワークフロー】用語集に従って翻訳を納品します。初稿 20 件のうち 6 件に訳語の不一致があり、担当者は該当箇所と正しい用語を指摘できます。納品前に同じ基準で修正をかける設計はどれですか？
<!-- kind: single; skills: claude-workflows -->

- A. 別々に 3 件の訳を作り、共通する表現が最も多い訳を納品する
- B. 評価役が用語集と照合して箇所を返し、生成役が直す。所定回数で残った指摘は人に回す
- C. 初稿の長さで翻訳を振り分け、長いものだけ別のモデルで作り直す

<details>
<summary>解答</summary>

**B** — 修正に使える指摘が返り、同じ基準で直ったかを確かめられます。多数決では全案が同じ誤訳をする場合に気づけません。文章の長さも合否の根拠にはなりません。(範囲: Agents and Workflows。復習: 6-2-5・Building effective agents)

</details>

### Q9. 【D1・エージェントとワークフロー】Agent SDK のエージェントが、回数も費用も際限なく使わないように上限を決めます。設定として適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-agent-sdk -->

- A. maxTurns で、ツールを使う往復の回数に上限を決める
- B. maxBudgetUsd で、見積もった費用に上限を決める
- C. system に「早めに終えて」と書くだけにする
- D. 上限に届いたら、ResultMessage の subtype で分かる

<details>
<summary>解答</summary>

**A, B, D** — 上限に届くと、subtype が error_max_turns や error_max_budget_usd の ResultMessage で止まります。指示だけでは上限になりません。(範囲: Agents and Workflows。復習: 6-3-1・How the agent loop works)

</details>

### Q10. 【D6・プロンプトとコンテキスト】「要約は 3 文で」とだけ書いたら、場面によって守られないことがありました。直し方として適切なものはどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 「必ず」「絶対に」を大きな文字で何度も書く
- B. 「通知の画面に収めるため、要約は 3 文で」のように理由を添える
- C. 指示を消して、例だけを渡す

<details>
<summary>解答</summary>

**B** — 理由が分かると、Claude は書かれていない場面にも広げて当てはめます。(範囲: Prompt and Context Engineering。復習: 4-1-1・Prompting best practices)

</details>

### Q11. 【D6・プロンプトとコンテキスト】応答に箇条書きを使わせず、文章で書かせたいです。頼み方として適切なものはどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 「箇条書きを使わないで」と禁止だけを書く
- B. 「段落がなめらかにつながる文章で書いて」と、してほしい形を書く
- C. 何も書かずに、出てきた箇条書きをアプリで消す

<details>
<summary>解答</summary>

**B** — 出力の書き方は、禁止ではなく、してほしいことで頼みます。(範囲: Prompt and Context Engineering。復習: 4-2-3・Prompting best practices)

</details>

### Q12. 【D6・プロンプトとコンテキスト】問い合わせの途中で返金規定が更新されました。履歴には旧版を根拠にした下書きがあり、全文を毎回渡す余裕はありません。新しい規定に沿って回答を作り直す方法はどれですか？
<!-- kind: single; skills: claude-context-management -->

- A. 確定した注文情報と未解決の問いを残し、適用日の合う新版の該当条項と出典を取り直す
- B. 旧版と新版の要約を 1 本に混ぜ、日付や出典は削って短くする
- C. 注文情報をすべて削り、旧版の下書きと新版の全文だけを渡す

<details>
<summary>解答</summary>

**A** — 必要なのは今回の注文にどの版を適用するかです。版を混ぜて日付を消すと条項の由来が消えます。注文情報を消すと適用条件が分かりません。(範囲: Prompt and Context Engineering。復習: 4-3-2・Effective context engineering for AI agents)

</details>

### Q13. 【D8・ツールと MCP】1 回の応答に照会要求 x と y があり、y の結果が先に届きました。x は一時的な照会エラーです。会話を続ける次のリクエストをどう組み立てますか？
<!-- kind: single; skills: claude-tool-use -->

- A. 先に届いた y を x の ID で返し、次のターンで残りを返す
- B. 元の応答を履歴に保ち、成功の結果に y、失敗の結果に x と is_error を付け、同じ user 発言に入れる
- C. 成功した y だけを返し、失敗した x の呼び出しを履歴から取り除く

<details>
<summary>解答</summary>

**B** — 結果の到着順で対応を決めると、別の注文を回答に使うことがあります。元の応答の ID ごとに結果をそろえ、失敗も 1 件として返せば、続きの判断ができます。(範囲: Tools and MCPs。復習: 5-1-2・Handle tool calls)

</details>

### Q14. 【D8・ツールと MCP】ツールを定義したまま、この 1 回だけはツールを使わせたくありません。tool_choice として適切なものはどれですか？
<!-- kind: single; skills: claude-tool-design -->

- A. { type: "auto" }
- B. { type: "none" }
- C. { type: "any" }

<details>
<summary>解答</summary>

**B** — none はツールを使わせず、auto(既定)は使うかを Claude が決めます。any は必ず使わせる指定で、Claude Opus 5.5 などでは 400 のエラーになります。(範囲: Tools and MCPs。復習: 5-2-2・Define tools)

</details>

### Q15. 【D8・ツールと MCP】ツールの説明に書くこととして、適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-tool-design -->

- A. そのツールが何をするか
- B. いつ使い、いつ使わないか
- C. 何を返すか
- D. ツールを作った人の名前

<details>
<summary>解答</summary>

**A, B, C** — 説明は、Claude がツールを選び、使い方を決める手がかりなので、詳しく書きます。(範囲: Tools and MCPs。復習: 5-2-1・Define tools)

</details>

### Q16. 【D7・安全性】ツールで取った外の文章を、`<document>` のタグで包んで渡しています。これだけでは足りない理由として適切なものはどれですか？
<!-- kind: single; skills: claude-safety -->

- A. タグを使うと、トークンが増えるから
- B. 外の文章の中でタグを閉じれば、タグの外に抜け出せるから
- C. Claude はタグを読めないから

<details>
<summary>解答</summary>

**B** — 外の文章は JSON にして tool_result の中に入れ、指示ではなくデータとして渡します。(範囲: Security and Safety。復習: 7-1-1・Mitigate jailbreaks and prompt injections)

</details>

### Q17. 【D7・安全性】エージェントに外のサービスの API を呼ばせます。API キーの扱いとして適切なものはどれですか？
<!-- kind: single; skills: claude-safety -->

- A. system に API キーを書いて、エージェントに使わせる
- B. エージェントの外側のプロキシで、リクエストに API キーを付け足す
- C. エージェントが読めるファイルに API キーを置く

<details>
<summary>解答</summary>

**B** — エージェントは秘密なしでリクエストを送り、守りの外にあるプロキシが秘密を足して転送します。プロキシで、送ってよい宛先だけを通すこともできます。(範囲: Security and Safety。復習: 7-2-3・Securely deploying AI agents)

</details>

### Q18. 【D7・安全性】返金規定を満たす注文です。返金処理には担当者の承認が必要ですが、承認記録の照会が停止しています。Claude は「承認済み」という正しい形式の JSON を返しました。復旧までの処理はどれですか？
<!-- kind: single; skills: claude-safety -->

- A. 出力が JSON スキーマに合っていることを確認して返金する
- B. 返金を先に実行し、照会の復旧後に承認記録と突き合わせる
- C. 実行側で承認を確認できるまで返金を保留し、記録とともに担当者へ回す

<details>
<summary>解答</summary>

**C** — JSON の形が合っていても、承認した人の記録にはなりません。先に返金すると後の照合で未承認と分かった時点で、お金はすでに動いています。テストでは、照会が失敗したケースの返金関数の呼び出しが 0 回で、担当者に届くことを確かめます。(範囲: Security and Safety。復習: 7-1-3・Securely deploying AI agents)

</details>

### Q19. 【D3・Claude Code】同じプロジェクトなのに 1 人だけ Claude Code の言語設定が違います。プロジェクトの settings.json は全員同一です。その人の .claude/settings.local.json にだけ同じ項目の指定があります。より上位の指定はありません。共通設定に戻す最小の変更はどれですか？
<!-- kind: single; skills: claude-code-config -->

- A. チーム全員のユーザー設定に同じ言語を追加する
- B. その人の settings.local.json から当該項目だけを外し、共有設定を読み直す
- C. 共有設定の項目を書き直し、同じ値で再度コミットする

<details>
<summary>解答</summary>

**B** — 個人用のプロジェクト設定が、この単一の値を上書きしています。共有設定やユーザー設定に書き足しても上書き元は残ります。配列の設定は項目によって結合されるため、同じ判断をすべての設定には広げません。(範囲: Claude Code。復習: 8-1-3・Settings files and precedence)

</details>

### Q20. 【D3・Claude Code】CLAUDE.md の書き方として、適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-code-config -->

- A. 「コードを整える」より「インデントは 2 文字の空白」のように、確かめられる形で書く
- B. 手順の長いものも、すべて 1 つの CLAUDE.md に書き足していく
- C. 短く保ち、見出しと箇条書きで整理する
- D. 食い違う指示がないか、ときどき見直す

<details>
<summary>解答</summary>

**A, C, D** — 手順の長いものや一部にしか関わらないものは、スキルやフォルダーごとの決まりに移します。(範囲: Claude Code。復習: 8-1-1・How Claude remembers your project)

</details>

### Q21. 【D3・Claude Code】PreToolUse のフックで、危ないコマンドを止め、止めた理由を Claude に伝えたいです。フックの終わり方として正しいものはどれですか？
<!-- kind: single; skills: claude-code-config -->

- A. 終了コード 0 で終え、標準出力に理由を書く
- B. 終了コード 2 で終え、標準エラーに理由を書く
- C. 何も返さずに、そのまま終える

<details>
<summary>解答</summary>

**B** — 終了コード 2 で止まり、標準エラーの理由が Claude に伝わります。PreToolUse で 0 を返しても許可したことにはならず、ふつうの権限の確認に進みます。(範囲: Claude Code。復習: 8-1-2・Automate actions with hooks)

</details>

### Q22. 【D4・評価とデバッグ】要約の機能の成功の基準として、最も適切なものはどれですか？
<!-- kind: single; skills: claude-evals -->

- A. よい要約を返すこと
- B. 評価のセットの 95% で、元の文章の重要な事実を 3 つすべて含むこと
- C. 利用者が気に入ること

<details>
<summary>解答</summary>

**B** — 成功の基準は、具体的で測れる形にします。(範囲: Eval, Testing, and Debugging。復習: 8-2-1・Define success criteria and build evaluations)

</details>

### Q23. 【D4・評価とデバッグ】返品窓口の評価は 100 件です。通常の 90 件は全問正解でしたが、人への引き継ぎが必要な残り 10 件は全件取り違えました。次の版でこの問題が直ったかを判定する採点方法はどれですか？
<!-- kind: single; skills: claude-evals -->

- A. 100 件の平均点だけで、改善前の平均を上回るか比べる
- B. 人に回した件数の合計が 10 件かどうかだけを数える
- C. 各ケースの期待する引き継ぎフラグと結果を照合し、引き継ぎが必要な群と通常の群の両方を比較する

<details>
<summary>解答</summary>

**C** — 1 件ずつ期待値と照合すれば、同じ 10 件でも別の注文を人に回した場合に気づけます。両群を分けると、通常件の成績が重大な見落としを隠すこともありません。(範囲: Eval, Testing, and Debugging。復習: 8-2-2・Define success criteria and build evaluations)

</details>

### Q24. 【D4・評価とデバッグ】似た 2 つのツールのうち、意図と違うほうを Claude が呼び続けます。最初に直すこととして適切なものはどれですか？
<!-- kind: single; skills: claude-evals, claude-tool-design -->

- A. 2 つのツールの説明を、何をするかだけでなく、いつ使うかで書き分ける
- B. ツールを呼ぶ回数の上限を下げる
- C. max_tokens を大きくする

<details>
<summary>解答</summary>

**A** — 別のツールが呼ばれるのは、説明があいまいなことが多いからです。直したら、同じ評価のセットで誤用が減ったかを確かめます。(範囲: Eval, Testing, and Debugging。復習: 8-2-3・Troubleshooting tool use)

</details>
