# レッスン3-3 演習 — detailsで開閉する

対象トピック: 3-3-1 〜 3-3-4

## 手元で試す

`index.html` に、よくある質問を 2 件置きます。

```html
<div class="faq">
  <details>
    <summary>受講に必要な環境は?</summary>
    <p>ブラウザーとテキストエディタだけです。</p>
  </details>

  <details>
    <summary>途中で中断できますか?</summary>
    <p>レッスンごとに進捗が残るので、いつでも再開できます。</p>
  </details>
</div>
```

`style.css` に次を足します。トークン(`--line` / `--radius-1` / `--space-2` など)はレッスン1-1 で `:root` に定義したものです。まだなら先に足してください。

```css
.faq {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

details {
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-2);
  background-color: var(--surface);
}

summary {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;

  &::marker {
    content: "";
  }

  &::before {
    content: "＋";
    color: var(--muted);
  }
}

details[open] {
  border-color: var(--accent);

  summary::before {
    content: "−";
  }
}
```

見出しを押すと開き、印が「＋」から「−」に変われば成功です。書けたら、次の改造をしてみましょう。

1. 片方の `details` に `open` を書いて、最初から開いた状態で表示されることを確かめる
2. 開いた状態でその見出しを押して閉じ、`open` が自動で外れることを開発者ツールで確かめる
3. `details[open]` の `border-color` を消して、開いていることの手がかりが印だけになることを確かめる

## 演習問題

### 問1(基本)

`summary` は `details` のどこに書きますか。

### 問2(基本)

最初から開いた状態で表示するには、どう書きますか。

### 問3(応用)

`::marker` の `content` を空にしたあと、必ずやるべきことは何ですか。理由も添えて答えてください。

### 問4(応用)

開いているときだけ枠の色を変える CSS を書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`details` の最初の子として書きます。閉じているときも見えている見出しになります。

</details>

<details>
<summary>問2の解答例</summary>

```html
<details open>
```

利用者が閉じると `open` は自動で外れます。

</details>

<details>
<summary>問3の解答例</summary>

代わりの印を `::before` などで置きます。印が無いと、開閉できる見出しだと伝わらなくなるからです。

</details>

<details>
<summary>問4の解答例</summary>

```css
details[open] {
  border-color: var(--accent);
}
```

</details>

## 確認クイズ

### Q1. `details` と `summary` で作れるものはどれですか。

- A. JavaScript なしで開閉できる部品
- B. 送信ボタン付きのフォーム
- C. 別ページへの移動リンク

<details>
<summary>答え</summary>

**A** — キーボード操作にも対応した開閉が、HTML だけで手に入ります。

</details>

### Q2. 開いている `details` に付いている属性はどれですか。

- A. `active`
- B. `open`
- C. `aria-expanded`

<details>
<summary>答え</summary>

**B** — ブラウザーが自動で付け外しします。閉じると外れます。

</details>

### Q3. `summary` の既定の三角を指す疑似要素はどれですか。

- A. `::marker`
- B. `::backdrop`
- C. `::placeholder`

<details>
<summary>答え</summary>

**A** — リストの中黒や番号を指すのと同じ仕組みです。

</details>

### Q4. 開いている間だけ見た目を変えるセレクタはどれですか。

- A. `details:hover`
- B. `details[open]`
- C. `details:checked`

<details>
<summary>答え</summary>

**B** — 属性セレクタで `open` が付いているかどうかを見ます。

</details>

### Q5. 開閉の状態を JavaScript で持たなくてよいのはなぜですか。

- A. CSS が状態を記憶しているから
- B. 状態が `open` 属性として HTML に現れ、ブラウザーが付け外しするから
- C. 開閉のたびにページが再読み込みされるから

<details>
<summary>答え</summary>

**B** — CSS は「いま付いているか」を見るだけで済みます。

</details>
