---
sourceRefs: [SRC-claude-docs-batch-20261031, SRC-claude-docs-batch-usage-20261031]
---
## 知識問題

### Q1. Message Batches API に向く処理はどれですか？
<!-- kind: single; skills: claude-batches -->

- A. 毎晩の、問い合わせ 5,000 件の分類
- B. チャット画面で、利用者の質問にすぐ答える
- C. 1 件の短い翻訳を、すぐに表示する

<details>
<summary>解答</summary>

**A** — 急がない大量の処理に向きます。結果が出るまで時間がかかることがあるので、すぐに答えを返す画面には向きません。

</details>

### Q2. Message Batches API の料金は、通常の料金のどれくらいですか？
<!-- kind: single; skills: claude-batches -->

- A. 50%
- B. 同じ
- C. 2 倍

<details>
<summary>解答</summary>

**A** — 入力と出力のトークンが、どちらも通常の料金の 50% です。

</details>

### Q3. バッチの結果は、送ったリクエストと同じ順に並んで返ります。
<!-- kind: boolean; skills: claude-batches -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 順は保たれないので、custom_id で元のリクエストと結びます。

</details>

### Q4. バッチの結果の種類のうち、課金されないものをすべて選んでください。
<!-- kind: multiple; skills: claude-batches -->

- A. errored
- B. canceled
- C. expired
- D. succeeded

<details>
<summary>解答</summary>

**A, B, C** — 応答が作られなかったリクエストは課金されません。

</details>

### Q5. バッチを送った直後に、結果を受け取れるのはどんなときですか？
<!-- kind: single; skills: claude-batches -->

- A. すべてのリクエストが終わったときか、24 時間たったときの早いほう
- B. 送った直後にいつでも
- C. 29 日たったとき

<details>
<summary>解答</summary>

**A** — 多くのバッチは 1 時間以内に終わります。29 日は、結果を取り出せる期間です。

</details>
