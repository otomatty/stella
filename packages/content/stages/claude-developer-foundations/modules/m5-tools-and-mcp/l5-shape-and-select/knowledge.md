---
sourceRefs: [SRC-anthropic-writing-tools-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-choice-20261031, SRC-claude-docs-tool-runner-20261126, SRC-mcp-tools-spec-20260728, SRC-claude-code-sdk-permissions-20261031, SRC-claude-managed-agent-permission-policies-20261126, SRC-claude-agent-skills-20261118, SRC-claude-agent-skills-availability-20261126, SRC-claude-code-skills-20261118, SRC-mcp-server-concepts-20261118, SRC-claude-docs-tool-use-20261031, SRC-claude-docs-tool-search-20261126]
---
# レッスン5-5の知識問題

### Q1. 備品検索は全拠点の棚情報と更新履歴を返します。利用者には今日借りられる候補を数件案内したいです。結果をどう変えますか？
<!-- kind: single; skills: claude-tool-design -->

- A. 全項目を返したまま、最終回答を短くするよう system に書く
- B. 拠点ごとに別のツールにし、それぞれのツールがその拠点の全項目を返す
- C. 備品名・受取拠点・貸出可能数を上限つきで返し、打ち切ったら絞り方を添える

<details>
<summary>解答</summary>

**C** — 候補を選ぶ材料を残し、件数の上限を明示すると、続きが必要なときに絞り直せます。

</details>

### Q2. 修理の受付状況を調べるツールが「失敗」と返し、Claude は受付が存在しないと答えます。実際には受付番号の欄に店舗名が入っていました。どこを直しますか？
<!-- kind: single; skills: claude-tool-design -->

- A. 結果に受付番号の形式と利用者への確認方法を書き、ツールの説明にも形式・入力例・番号がない場合の扱いを足す
- B. system に「番号を正確に扱う」と書き、失敗した入力を間隔を空けて送り直す
- C. 受付状況のツールを必ず使う設定にして、エラー時の答えを短くする

<details>
<summary>解答</summary>

**A** — 受付を検索する前に入力の形式が合わず止まっています。結果に直し方があれば、Claude は番号を尋ねてから検索できます。

</details>

### Q3. 通知の宛先一覧を表示する機能と、実際に通知を送るツールがあります。送信される前に、必ず人が宛先と本文を確認できるようにするにはどうしますか？
<!-- kind: single; skills: claude-tool-use -->

- A. system に、送信前は必ず利用者に確認するよう書く
- B. 送信の tool_use を受け取ったら、アプリが宛先と本文を表示し、承認されたときだけ送信する
- C. アプリで送信を済ませ、Claude が回答を返す前に送信内容を表示する

<details>
<summary>解答</summary>

**B** — 人が判断する間は送信関数を呼びません。拒否された場合も、アプリが実行しなかったことをツール結果にして返せます。

</details>

### Q4. 保健室の担当者は、毎月同じ書式で備品の点検報告を作ります。数値は別に運用している台帳の最新値が必要です。どう提供しますか？
<!-- kind: single; skills: claude-mcp -->

- A. 書式は Skill にまとめ、台帳は MCP のツールで照会する
- B. 台帳の前月の写しを Skill に入れ、最新の台帳へは接続しない
- C. 報告の手順と台帳の接続手順を Skill に書き、接続用の秘密も同じフォルダーへ入れる

<details>
<summary>解答</summary>

**A** — 固定の書式と手順を Skill で再利用し、変わる数値を MCP で取得できます。台帳の認証情報は接続側で管理します。

</details>

### Q5. 公開されている市の案内を検索する機能が要ります。既存のウェブ検索で要件を満たし、アプリの担当者は検索システムの保守を減らしたいです。何を使いますか？
<!-- kind: single; skills: claude-tool-design -->

- A. 検索用の関数を自分のアプリで実装し、クライアントツールとして公開する
- B. 同じ検索を提供する MCP サーバーを新たに実装して、アプリからつなぐ
- C. Anthropic 側で動くウェブ検索をサーバーツールとして指定する

<details>
<summary>解答</summary>

**C** — 既存のウェブ検索で要件が満たせるなら、サーバーツールとして指定するだけで、検索の実行と保守を任せられます。

</details>

### Q6. 自作ツールと MCP のツールを合わせると 20 個あります。依頼ごとに使うのは一部ですが、どの機能も残したいです。定義が使うコンテキストをどう減らしますか？
<!-- kind: single; skills: claude-tool-design -->

- A. 選び方が伝わる説明まで短くして、全ツールの定義を毎回渡す
- B. ツール検索に対応する構成で、必要になった定義を後から読み込む
- C. 使う頻度が低い機能は一覧から外して、利用者が必要なときに管理者へ依頼する

<details>
<summary>解答</summary>

**B** — Claude が必要なツールを検索して定義を読み込める構成なら、使わない定義を毎回文脈へ入れずに済みます。

</details>
