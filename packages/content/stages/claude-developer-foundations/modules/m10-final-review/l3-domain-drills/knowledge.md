---
sourceRefs: [SRC-claude-docs-ts-sdk-20261031, SRC-claude-api-messages-create-20261031, SRC-claude-docs-errors-long-requests-20261031, SRC-claude-docs-context-windows-20261031, SRC-claude-docs-thinking-20261031, SRC-claude-docs-prompt-caching-20261031, SRC-claude-docs-caching-structure-20261031, SRC-anthropic-effective-agents-20261031, SRC-claude-code-agent-loop-control-20261031, SRC-claude-docs-prompting-20261031, SRC-anthropic-context-engineering-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-choice-20261031, SRC-claude-docs-define-tools-20261031, SRC-claude-docs-jailbreaks-20261031, SRC-claude-code-sdk-secure-deployment-20261031, SRC-claude-docs-hallucinations-20261031, SRC-claude-code-settings-20261031, SRC-claude-code-memory-20261031, SRC-claude-code-hooks-guide-20261031, SRC-claude-docs-evals-20261031, SRC-claude-docs-eval-grading-20261031, SRC-claude-docs-tool-troubleshooting-20261031]
---
## 知識問題

### Q1. TypeScript の SDK で、ある 1 つのリクエストだけ、自動の送り直しの回数を 5 回にしたいです。書き方として適切なものはどれですか？
<!-- kind: single; skills: claude-sdk-setup, claude-api-errors -->

- A. messages.create の第 2 引数に { maxRetries: 5 } を渡す
- B. リクエストの本文に retries: 5 を書く
- C. SDK を使わず、送り直しを自分で書く

<details>
<summary>解答</summary>

**A** — SDK の送り直しの回数は、クライアントを作るときにも、リクエストごとにも maxRetries で変えられます。既定は 2 回です。(範囲: Applications and Integration。復習: 1-2-1・TypeScript SDK)

</details>

### Q2. max_tokens を 1024 にすると、入力と出力を合わせたトークン数が 1024 に収まります。
<!-- kind: boolean; skills: claude-messages-request -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — max_tokens は出力の上限です。入力と出力を合わせた量は、コンテキストウィンドウに収めます。(範囲: Applications and Integration。復習: 1-1-3・4-3-1・Messages(API reference))

</details>

### Q3. 画面には出さない、max_tokens のとても大きいリクエストを送ります。送り方として適切なものはどれですか？
<!-- kind: single; skills: claude-streaming, claude-batches -->

- A. ストリーミングかバッチで送る
- B. 画面に出さないので、ストリーミングを使わずに 1 回で待つ
- C. max_tokens を小さくして、何度も送る

<details>
<summary>解答</summary>

**A** — 長く待つ通信は、途中のネットワークで切られることがあります。公式ドキュメントは、長いリクエストではストリーミングかバッチを使うよう案内しています。(範囲: Applications and Integration。復習: 2-2-1・Claude API errors の Long requests)

</details>

### Q4. 考える過程(thinking)のトークンは、max_tokens の上限に数えません。
<!-- kind: boolean; skills: claude-token-cost -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 考える過程も出力に数えるので、考える量が増えると答えに回る分が減り、答えが途中で切れることがあります。(範囲: Model Selection and Optimization。復習: 3-3-2・Thinking)

</details>

### Q5. 長い前半を持つプロンプトを、1 回だけ送ります。前半に cache_control を付けたときの費用として正しいものはどれですか？
<!-- kind: single; skills: claude-prompt-caching, claude-token-cost -->

- A. 書き込みは通常の入力より高いので、付けないときより高くなる
- B. 読み込みの料金になるので、付けないときより安くなる
- C. 1 回目は無料で書き込まれる

<details>
<summary>解答</summary>

**A** — キャッシュの書き込みは通常の入力より高く、読み込みはずっと安いので、同じ前半を 2 回以上使うときに得になります。(範囲: Model Selection and Optimization。復習: 3-2-1・Prompt caching)

</details>

### Q6. プロンプトキャッシュを使った応答で、入力のトークン数の合計を求める式として正しいものはどれですか？
<!-- kind: single; skills: claude-prompt-caching, claude-token-cost -->

- A. input_tokens だけ
- B. input_tokens + cache_creation_input_tokens + cache_read_input_tokens
- C. cache_read_input_tokens だけ

<details>
<summary>解答</summary>

**B** — input_tokens は、最後のキャッシュの区切りより後ろの部分だけです。(範囲: Model Selection and Optimization。復習: 3-2-3・Prompt caching)

</details>

### Q7. 同じコードを、観点の違う複数のプロンプトで同時に調べ、結果を突き合わせて見落としを減らしたいです。向く形はどれですか？
<!-- kind: single; skills: claude-workflows -->

- A. プロンプトの連鎖
- B. 並列化
- C. ルーティング

<details>
<summary>解答</summary>

**B** — 互いに独立した処理は並べて同時に行います。同じ仕事を何度か行って結果を比べる形を、投票と呼びます。(範囲: Agents and Workflows。復習: 6-2-3・Building effective agents)

</details>

### Q8. 翻訳を作らせ、決まった評価の基準で指摘させて、直させることを繰り返したいです。向く形はどれですか？
<!-- kind: single; skills: claude-workflows -->

- A. 評価役の指摘で生成役に直させる形
- B. 入力の種類で振り分ける形
- C. 指揮役が仕事を分けて配る形

<details>
<summary>解答</summary>

**A** — 評価の基準がはっきりしていて、指摘で質が上がる仕事に向きます。(範囲: Agents and Workflows。復習: 6-2-5・Building effective agents)

</details>

### Q9. Agent SDK のエージェントが、回数も費用も際限なく使わないように上限を決めます。設定として適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-agent-sdk -->

- A. maxTurns で、ツールを使う往復の回数に上限を決める
- B. maxBudgetUsd で、見積もった費用に上限を決める
- C. system に「早めに終えて」と書くだけにする
- D. 上限に届いたら、ResultMessage の subtype で分かる

<details>
<summary>解答</summary>

**A, B, D** — 上限に届くと、subtype が error_max_turns や error_max_budget_usd の ResultMessage で止まります。指示だけでは上限になりません。(範囲: Agents and Workflows。復習: 6-3-1・How the agent loop works)

</details>

### Q10. 「要約は 3 文で」とだけ書いたら、場面によって守られないことがありました。直し方として適切なものはどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 「必ず」「絶対に」を大きな文字で何度も書く
- B. 「通知の画面に収めるため、要約は 3 文で」のように理由を添える
- C. 指示を消して、例だけを渡す

<details>
<summary>解答</summary>

**B** — 理由が分かると、Claude は書かれていない場面にも広げて当てはめます。(範囲: Prompt and Context Engineering。復習: 4-1-1・Prompting best practices)

</details>

### Q11. 応答に箇条書きを使わせず、文章で書かせたいです。頼み方として適切なものはどれですか？
<!-- kind: single; skills: claude-prompt-design -->

- A. 「箇条書きを使わないで」と禁止だけを書く
- B. 「段落がなめらかにつながる文章で書いて」と、してほしい形を書く
- C. 何も書かずに、出てきた箇条書きをアプリで消す

<details>
<summary>解答</summary>

**B** — 出力の書き方は、禁止ではなく、してほしいことで頼みます。(範囲: Prompt and Context Engineering。復習: 4-2-3・Prompting best practices)

</details>

### Q12. エージェントに渡す社内の資料が多く、全部を入れるとコンテキストウィンドウの大半を使います。考え方として適切なものはどれですか？
<!-- kind: single; skills: claude-context-management -->

- A. 多いほど正確になるので、すべて入れる
- B. 結果に効く情報だけを、できるだけ少ないトークンで入れる
- C. 資料は入れず、Claude の知識だけで答えさせる

<details>
<summary>解答</summary>

**B** — コンテキストが長くなると、正しく思い出す力が落ちることがあります。必要な資料は、ツールで取りに行かせることもできます。(範囲: Prompt and Context Engineering。復習: 4-3-2・Effective context engineering for AI agents)

</details>

### Q13. 1 つの応答に tool_use のブロックが 3 つありました。結果の返し方として正しいものはどれですか？
<!-- kind: single; skills: claude-tool-use -->

- A. 3 つの tool_result を、次の 1 つの user の発言にまとめて入れる
- B. 1 つずつ別のリクエストで返し、3 回送る
- C. 最初の 1 つだけ返し、残りは捨てる

<details>
<summary>解答</summary>

**A** — それぞれの tool_result を tool_use_id で呼び出しと結び、1 つの user の発言にまとめて返します。(範囲: Tools and MCPs。復習: 5-1-2・Handle tool calls)

</details>

### Q14. ツールを定義したまま、この 1 回だけはツールを使わせたくありません。tool_choice として適切なものはどれですか？
<!-- kind: single; skills: claude-tool-design -->

- A. { type: "auto" }
- B. { type: "none" }
- C. { type: "any" }

<details>
<summary>解答</summary>

**B** — none はツールを使わせず、auto(既定)は使うかを Claude が決めます。any は必ず使わせる指定で、Claude Opus 5.5 などでは 400 のエラーになります。(範囲: Tools and MCPs。復習: 5-2-2・Define tools)

</details>

### Q15. ツールの説明に書くこととして、適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-tool-design -->

- A. そのツールが何をするか
- B. いつ使い、いつ使わないか
- C. 何を返すか
- D. ツールを作った人の名前

<details>
<summary>解答</summary>

**A, B, C** — 説明は、Claude がツールを選び、使い方を決める手がかりなので、詳しく書きます。(範囲: Tools and MCPs。復習: 5-2-1・Define tools)

</details>

### Q16. ツールで取った外の文章を、`<document>` のタグで包んで渡しています。これだけでは足りない理由として適切なものはどれですか？
<!-- kind: single; skills: claude-safety -->

- A. タグを使うと、トークンが増えるから
- B. 外の文章の中でタグを閉じれば、タグの外に抜け出せるから
- C. Claude はタグを読めないから

<details>
<summary>解答</summary>

**B** — 外の文章は JSON にして tool_result の中に入れ、指示ではなくデータとして渡します。(範囲: Security and Safety。復習: 7-1-1・Mitigate jailbreaks and prompt injections)

</details>

### Q17. エージェントに外のサービスの API を呼ばせます。API キーの扱いとして適切なものはどれですか？
<!-- kind: single; skills: claude-safety -->

- A. system に API キーを書いて、エージェントに使わせる
- B. エージェントの外側のプロキシで、リクエストに API キーを付け足す
- C. エージェントが読めるファイルに API キーを置く

<details>
<summary>解答</summary>

**B** — エージェントは秘密なしでリクエストを送り、守りの外にあるプロキシが秘密を足して転送します。プロキシで、送ってよい宛先だけを通すこともできます。(範囲: Security and Safety。復習: 7-2-3・Securely deploying AI agents)

</details>

### Q18. 資料にない質問で、もっともらしい作り話の答えが返ってきました。最初に試すこととして適切なものはどれですか？
<!-- kind: single; skills: claude-grounding -->

- A. 分からないときは分からないと答えてよい、と指示に書く
- B. max_tokens を大きくする
- C. 同じ質問を何度も送り、いちばん長い答えを使う

<details>
<summary>解答</summary>

**A** — 分からないと答えてよいと許すと、ハルシネーションが減ります。(範囲: Security and Safety。復習: 7-2-1・Reduce hallucinations)

</details>

### Q19. 同じ設定の項目が、共有するプロジェクトの .claude/settings.json と、自分だけの .claude/settings.local.json で違う値になっていました。使われる値はどちらですか？
<!-- kind: single; skills: claude-code-config -->

- A. .claude/settings.json の値
- B. .claude/settings.local.json の値
- C. どちらも使われず、ユーザーの設定の値

<details>
<summary>解答</summary>

**B** — 強い順に、管理された設定、コマンドライン、プロジェクトのローカル、共有するプロジェクト、ユーザーです。permissions.allow のような一覧の項目は、上書きではなく足し合わされます。(範囲: Claude Code。復習: 8-1-3・Settings files and precedence)

</details>

### Q20. CLAUDE.md の書き方として、適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-code-config -->

- A. 「コードを整える」より「インデントは 2 文字の空白」のように、確かめられる形で書く
- B. 手順の長いものも、すべて 1 つの CLAUDE.md に書き足していく
- C. 短く保ち、見出しと箇条書きで整理する
- D. 食い違う指示がないか、ときどき見直す

<details>
<summary>解答</summary>

**A, C, D** — 手順の長いものや一部にしか関わらないものは、スキルやフォルダーごとの決まりに移します。(範囲: Claude Code。復習: 8-1-1・How Claude remembers your project)

</details>

### Q21. PreToolUse のフックで、危ないコマンドを止め、止めた理由を Claude に伝えたいです。フックの終わり方として正しいものはどれですか？
<!-- kind: single; skills: claude-code-config -->

- A. 終了コード 0 で終え、標準出力に理由を書く
- B. 終了コード 2 で終え、標準エラーに理由を書く
- C. 何も返さずに、そのまま終える

<details>
<summary>解答</summary>

**B** — 終了コード 2 で止まり、標準エラーの理由が Claude に伝わります。PreToolUse で 0 を返しても許可したことにはならず、ふつうの権限の確認に進みます。(範囲: Claude Code。復習: 8-1-2・Automate actions with hooks)

</details>

### Q22. 要約の機能の成功の基準として、最も適切なものはどれですか？
<!-- kind: single; skills: claude-evals -->

- A. よい要約を返すこと
- B. 評価のセットの 95% で、元の文章の重要な事実を 3 つすべて含むこと
- C. 利用者が気に入ること

<details>
<summary>解答</summary>

**B** — 成功の基準は、具体的で測れる形にします。(範囲: Eval, Testing, and Debugging。復習: 8-2-1・Define success criteria and build evaluations)

</details>

### Q23. 答えに会社名が含まれるかを、評価のセットの 500 件で毎回確かめます。採点の方法として適切なものはどれですか？
<!-- kind: single; skills: claude-evals -->

- A. 人が 500 件を毎回読む
- B. コードで、会社名を含むかを確かめる
- C. LLM に、答えの印象を 1〜5 で付けさせる

<details>
<summary>解答</summary>

**B** — 決まりに当てはめられる採点は、最も速く確かなコードで行います。細かな判断が要るときは、はっきりした基準で LLM に採点させます。(範囲: Eval, Testing, and Debugging。復習: 8-2-2・Define success criteria and build evaluations)

</details>

### Q24. 似た 2 つのツールのうち、意図と違うほうを Claude が呼び続けます。最初に直すこととして適切なものはどれですか？
<!-- kind: single; skills: claude-evals, claude-tool-design -->

- A. 2 つのツールの説明を、何をするかだけでなく、いつ使うかで書き分ける
- B. ツールを呼ぶ回数の上限を下げる
- C. max_tokens を大きくする

<details>
<summary>解答</summary>

**A** — 別のツールが呼ばれるのは、説明があいまいなことが多いからです。直したら、同じ評価のセットで誤用が減ったかを確かめます。(範囲: Eval, Testing, and Debugging。復習: 8-2-3・Troubleshooting tool use)

</details>
