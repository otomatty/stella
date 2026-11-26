---
sourceRefs: [SRC-mcp-architecture-20261126, SRC-mcp-server-concepts-20261118, SRC-mcp-tools-spec-20260728, SRC-mcp-resources-spec-20260728, SRC-mcp-prompts-20261126, SRC-claude-code-mcp-20261126, SRC-mcp-stdio-20261126, SRC-mcp-streamable-http-20261126, SRC-claude-code-sdk-mcp-20261031, SRC-claude-docs-mcp-connector-usage-20261031, SRC-mcp-authorization-20261126, SRC-claude-sdk-mcp-oauth-20261126]
---
# レッスン5-4の知識問題

### Q1. 工房の予約アプリは、Claude に空き枠を検索させます。利用規則は、利用者が規則の欄を開いたときにアプリが表示します。サーバーでどう提供しますか？
<!-- kind: single; skills: claude-mcp -->

- A. 空き枠検索と利用規則をツールにして、両方ともモデルに呼ばせる
- B. 空き枠検索をツール、利用規則を URI で読めるリソースにする
- C. 空き枠検索をリソース、利用規則をプロンプトにして、利用者に選ばせる

<details>
<summary>解答</summary>

**B** — モデルが必要に応じて検索し、アプリが画面を開く動作に合わせて規則を読みます。

</details>

### Q2. 受付の人が定型の予約案内を作るときだけ、Claude Code でひな形を選びたいです。工房の MCP サーバーに何を足しますか？
<!-- kind: single; skills: claude-mcp -->

- A. 案内文のひな形をリソースにし、アプリが毎回最初に読む
- B. 案内文を作るツールを足し、いつ呼ぶかをモデルに任せる
- C. 案内文のひな形をプロンプトとして公開し、受付の人がスラッシュコマンドで開く

<details>
<summary>解答</summary>

**C** — 利用者が決まった作業を始めるためのひな形は、プロンプトとして出せます。

</details>

### Q3. 予約検索に営業時間外の時刻が渡りました。別のテストでは、実装していないメソッド名が届きました。サーバーは何を返しますか？
<!-- kind: single; skills: claude-mcp -->

- A. 時刻違いは isError を付けたツール結果、未実装のメソッドは JSON-RPC のエラー
- B. どちらも JSON-RPC のエラーにし、修正はアプリのログを見て行う
- C. どちらも isError を付けたツール結果にし、次の入力をモデルに直させる

<details>
<summary>解答</summary>

**A** — 時刻違いはツールまで届いた失敗です。モデルに営業時間を伝えれば入力を直せます。未実装のメソッドはプロトコルのエラーです。

</details>

### Q4. stdio サーバーに起動ログを足したら、クライアントが最初の行を読み取れず止まりました。どこを直しますか？
<!-- kind: single; skills: claude-mcp -->

- A. 起動が終わるまでクライアントの待ち時間を延ばす
- B. 起動ログを標準エラーへ移し、標準出力を MCP のメッセージ専用にする
- C. 標準出力で、起動ログとメッセージの間に空行を足す

<details>
<summary>解答</summary>

**B** — stdio の標準出力は改行で区切った MCP のメッセージの経路です。ログを別の経路へ移します。

</details>

### Q5. 開発端末でだけ動かしていた工房の検索を、複数の窓口から同じサーバーで使いたいです。Messages API の MCP コネクターからツールを呼ぶ要件もあります。どうしますか？
<!-- kind: single; skills: claude-mcp -->

- A. 各端末に stdio のプログラムを配り、そのファイルのパスをコネクターへ渡す
- B. 開発端末の localhost に HTTP サーバーを起動し、その URL をコネクターに登録する
- C. API から到達できる共有の Streamable HTTP の入口を用意し、その URL を登録する

<details>
<summary>解答</summary>

**C** — コネクターから届く HTTP のサーバーが要ります。端末の子プロセスや localhost の URL は API から直接使えません。

</details>

### Q6. 備品管理用のトークンが、工房の MCP サーバーの Authorization ヘッダーに届きました。発行元と有効期限は正しいです。どう扱いますか？
<!-- kind: single; skills: claude-mcp -->

- A. あて先が異なるので拒否し、工房の MCP サーバー用のトークンで接続する
- B. 有効期限が切れていないので受け取り、権限の広い操作だけを制限する
- C. ヘッダーから問い合わせ文字列に移してもらい、工房用のトークンと見分ける

<details>
<summary>解答</summary>

**A** — サーバーは発行元や有効性に加え、自分あてのトークンかを確かめます。渡し方を変えてもあて先は変わりません。

</details>
