---
sourceRefs: [SRC-claude-docs-prompt-caching-20261031, SRC-claude-docs-caching-structure-20261031]
---
## 知識問題

### Q1. プロンプトキャッシュが得になる場面をすべて選んでください。
<!-- kind: multiple; skills: claude-prompt-caching -->

- A. 長い手引きを入れたまま、質問を何度も受け付ける
- B. 例をたくさん入れた同じ指示で、繰り返し分類する
- C. 毎回違う短い文を、一度だけ翻訳する

<details>
<summary>解答</summary>

**A, B** — 書き込みは通常の入力より高いので、同じ前半を 2 回以上使うときに得になります。

</details>

### Q2. 5 分のキャッシュの書き込みと読み込みの料金は、通常の入力の料金の何倍ですか？(倍率の例外があるモデルは除きます)
<!-- kind: single; skills: claude-prompt-caching -->

- A. 書き込み 1.25 倍、読み込み 0.1 倍
- B. 書き込み 0.1 倍、読み込み 1.25 倍
- C. どちらも 0.5 倍

<details>
<summary>解答</summary>

**A** — 1 時間のキャッシュの書き込みは 2 倍です。読み込みは、Claude Opus 5.5・Claude Sonnet 5.5 などでさらに安くなります。

</details>

### Q3. system に「指示・資料・今の時刻」の順でブロックを並べています。cache_control を付ける位置として適切なものはどれですか？
<!-- kind: single; skills: claude-prompt-caching -->

- A. 資料のブロック
- B. 時刻のブロック
- C. 指示のブロック

<details>
<summary>解答</summary>

**A** — 毎回同じ部分の最後に区切りを置きます。B は毎回変わるので、毎回書き込みになります。時刻は質問と一緒に後ろへ移すのがよい並べ方です。

</details>

### Q4. ツールの定義を変えたとき、使えなくなるキャッシュはどれですか？
<!-- kind: single; skills: claude-prompt-caching -->

- A. tools・system・messages のすべて
- B. tools だけ
- C. messages だけ

<details>
<summary>解答</summary>

**A** — キャッシュは tools・system・messages の順に前から決まるので、前を変えると後ろもすべて使えなくなります。

</details>

### Q5. 応答の usage が cache_read_input_tokens: 0、cache_creation_input_tokens: 0 でした。考えられる理由はどれですか？
<!-- kind: single; skills: claude-prompt-caching -->

- A. キャッシュしようとした前半が、モデルの最低の長さに届いていない
- B. キャッシュから全部を読み込めた
- C. 出力が max_tokens で切れた

<details>
<summary>解答</summary>

**A** — 短い前半は、エラーにならずにキャッシュされないまま処理されます。B なら cache_read_input_tokens に値が入ります。

</details>

### Q6. usage が cache_read_input_tokens: 30000、cache_creation_input_tokens: 0、input_tokens: 50 のとき、入力の合計は何トークンですか？
<!-- kind: single; skills: claude-prompt-caching -->

- A. 30050
- B. 50
- C. 30000

<details>
<summary>解答</summary>

**A** — input_tokens は最後の区切りより後ろの量だけです。入力の合計は 3 つの和です。

</details>
