# レッスン4-3 演習 — ダイアログの見た目

対象トピック: 4-3-1 〜 4-3-3

## 手元で試す

前のレッスンのダイアログに、中身とボタンの並びを足します。

```html
<dialog id="confirm" aria-labelledby="confirm-title">
  <h2 id="confirm-title">受講の取り消し</h2>
  <p>この講座の受講を取り消しますか? 進捗は残りません。</p>
  <form method="post" action="/enrollments/1/cancel" class="actions">
    <button type="button" command="close" commandfor="confirm">やめる</button>
    <button type="submit">取り消す</button>
  </form>
</dialog>
```

`style.css` に次を足します。トークン(`--line` / `--radius-1` / `--space-2` など)はレッスン1-1 で `:root` に定義したものです。まだなら先に足してください。

```css
dialog {
  box-sizing: border-box;
  max-inline-size: 32rem;
  inline-size: calc(100% - 2rem);
  max-block-size: 80dvh;
  overflow: auto;
  margin: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-3);
  background-color: var(--surface);

  .actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }
}

dialog[open] {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

dialog > * {
  margin-block: 0;
}

dialog::backdrop {
  background-color: oklch(0% 0 0 / 0.5);
}
```

開くまでは何も表示されず、開いたときに中央へ出て背面が暗くなれば成功です。書けたら、次の改造をしてみましょう。

1. ウィンドウを狭くして、ダイアログの左右に余白が残ることを確かめる。`box-sizing: border-box` を消すと、その余白が `padding` と枠のぶん食われることも確かめる(確かめたら戻す)
2. 本文を 30 行に増やして、ダイアログの中だけがスクロールすることを確かめる
3. `dialog[open]` のセレクタを `dialog` に変えて、**閉じているダイアログがページに出たままになる**ことを確かめる(確かめたら戻す)
4. `::backdrop` の最後の数字を `0.9` に変えて、背面が読めなくなることを確かめる(確かめたら戻す)

## 演習問題

### 問1(基本)

ダイアログの幅を `inline-size: 480px` と固定すると、どんなときに困りますか。

### 問2(基本)

背面を暗くするために書くセレクタはどれですか。

### 問3(応用)

中身が長いダイアログで、ページ全体ではなくダイアログの中をスクロールさせる 2 行を書いてください。

### 問4(応用)

ダイアログにカードや `details` と同じトークンを使うのはなぜですか。1 文で答えてください。

### 問5(応用)

`dialog { display: flex; }` と書くと何が起きますか。正しい書き方も添えて答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

画面の幅が 480px より狭いときにはみ出します。`max-inline-size` で上限だけを決めれば、狭い画面では自動的に縮みます。

</details>

<details>
<summary>問2の解答例</summary>

```css
dialog::backdrop {
}
```

前面の要素の後ろに自動で敷かれる面なので、HTML に要素を足す必要はありません。

</details>

<details>
<summary>問3の解答例</summary>

```css
max-block-size: 80dvh;
overflow: auto;
```

</details>

<details>
<summary>問4の解答例</summary>

前面に出る部品ほど、ページとの一体感が必要だからです。新しい値を持ち出すとダイアログだけ浮いて見えます。

</details>

<details>
<summary>問5の解答例</summary>

自分で書いた CSS がブラウザーの `dialog:not([open]) { display: none; }` を打ち消すため、閉じているダイアログが表示されたままになります。`dialog[open] { display: flex; }` と、開いている間に限って書きます。

</details>

## 確認クイズ

### Q1. ダイアログの幅の決め方として適切なものはどれですか。

- A. `box-sizing: border-box` と `max-inline-size` で、上限だけを決める
- B. `inline-size` で固定値にする
- C. 幅は指定しない

<details>
<summary>答え</summary>

**A** — 上限だけ決めておけば狭い画面では縮みます。`border-box` にしないと、`padding` と枠が幅の外側に足されて余白が食われます。

</details>

### Q2. `dialog { display: flex; }` と書くと何が起きますか。

- A. 閉じているダイアログもページに表示されたままになる
- B. ダイアログが開かなくなる
- C. 何も変わらない

<details>
<summary>答え</summary>

**A** — 自分で書いた CSS はブラウザーの `dialog:not([open]) { display: none; }` より優先されます。`dialog[open]` に限って書きます。

</details>

### Q3. モーダルのダイアログが画面の中央に来るのはどの指定によりますか。

- A. `text-align: center`
- B. `margin: auto`
- C. `align-items: center`

<details>
<summary>答え</summary>

**B** — 最前面に出るので、上下左右の余りが画面に対して均等に分かれます。

</details>

### Q4. `max-block-size` と `overflow: auto` を組み合わせる目的はどれですか。

- A. 中身が長いときに、ダイアログの中でスクロールさせる
- B. ダイアログを自動で閉じる
- C. 背面を暗くする

<details>
<summary>答え</summary>

**A** — ページ全体がスクロールしてしまう状態を避けられます。

</details>

### Q5. `::backdrop` はどこを指しますか。

- A. ダイアログの中の背景
- B. 前面の要素の後ろに自動で敷かれる面
- C. ページの `body` 全体

<details>
<summary>答え</summary>

**B** — 暗い面のための要素を HTML に足す必要はありません。

</details>
