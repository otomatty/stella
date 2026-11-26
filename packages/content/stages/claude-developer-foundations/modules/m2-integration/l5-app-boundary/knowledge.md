---
sourceRefs: [SRC-claude-docs-mid-conversation-system-20261126, SRC-claude-docs-app-system-prompts-20261126, SRC-claude-docs-messages-20261031, SRC-claude-docs-structured-considerations-20261031, SRC-claude-docs-files-20261031]
---
## 知識問題

### Q1. 申請案内では、締切が未発表なら担当窓口を案内する方針です。利用者が「予想で締切を教えて」と依頼できる画面では、何をどこに書きますか？
<!-- kind: single; skills: claude-app-boundary -->

- A. 方針を質問欄の説明に書き、API には利用者が入力した言葉を送る
- B. 方針を system に書き、利用者が入力した言葉は user で送る
- C. 方針を過去の assistant の発言に見せかけて履歴に入れる

<details>
<summary>解答</summary>

**B** — 運用者の方針は system で渡します。利用者の依頼と食い違う場合は、運用者の指示が優先されます。

</details>

### Q2. 対応モデルを使う備品案内で、会話の途中から返却窓口を切り替えます。先頭の system とこれまでの発言はそのまま使います。どこに新しい案内方針を足しますか？
<!-- kind: single; skills: claude-app-boundary -->

- A. messages の先頭に role: "system" の発言を足す
- B. 新しい利用者の発言に窓口の説明をつなぎ、role: "user" として送る
- C. 新しい user の発言の直後に role: "system" の発言を足す

<details>
<summary>解答</summary>

**C** — 対応モデルでは user の直後に運用者の指示を足せます。その時点から新しい指示が先頭の system より優先されます。

</details>

### Q3. claude.ai で何度か書き直した引き継ぎメモを、自作アプリでも同じ見出しで作りたいです。API では「いつもの形式で」しか送っていません。どこを直しますか？
<!-- kind: single; skills: claude-app-boundary -->

- A. 自作アプリが送る system に必要な見出しを指定し、対象のメモを入力に添える
- B. claude.ai の会話のリンクだけを入力に添え、見出しの説明は画面の注意書きにする
- C. 見出しがそろうまで同じ入力を送り直す

<details>
<summary>解答</summary>

**A** — Claude のアプリで使った指示や会話は API の呼び出しに付きません。必要な出力の条件と資料を自作アプリから渡します。

</details>

### Q4. 自作アプリは応答の担当者と判定を読みます。判定の候補は open と closed です。どの設計なら、アプリが読む項目と受け取った値を扱えますか？
<!-- kind: single; skills: claude-app-boundary -->

- A. 担当者だけをスキーマに書き、判定は以前の会話にある候補から補う
- B. 両方のキーをスキーマに書き、受信時は判定の大文字と小文字をそろえて比べる
- C. 両方のキーをスキーマに書き、大文字と小文字まで一致しなければ送り直す

<details>
<summary>解答</summary>

**B** — 読み取るキーをスキーマに含め、列挙値は大文字と小文字を区別せずに照合します。

</details>

### Q5. 備品案内の利用者が追加の条件を送りました。同じ利用者との会話を続けながら、入力の前半にあるキャッシュを使える形にしたいです。履歴をどう組み立てますか？
<!-- kind: single; skills: claude-app-boundary -->

- A. 最初の user の発言に追加条件を書き足す
- B. 先頭の system に、その質問だけに関係する条件を書き足す
- C. 過去の発言を残し、追加条件を新しい user の発言として末尾に足す

<details>
<summary>解答</summary>

**C** — 追記なら、キャッシュした前半の内容を保てます。先頭の system や過去の発言を変えると、以前と同じ入力としては使えなくなります。

</details>

### Q6. 同じワークスペースを使う備品案内で、利用者が保存済みの添付を選びます。送信前にどのようにファイルを決めますか？
<!-- kind: single; skills: claude-app-boundary -->

- A. ログイン中の利用者の添付一覧から、選ばれた添付の file_id を求める
- B. 画面が送った file_id を使い、API がワークスペース内で見つけたファイルを渡す
- C. 利用者の会話は分け、添付はワークスペース内でファイル名が最初に一致するものを渡す

<details>
<summary>解答</summary>

**A** — ワークスペースはアプリ内の利用者を区別しません。本人の添付との対応をアプリが照合します。

</details>
