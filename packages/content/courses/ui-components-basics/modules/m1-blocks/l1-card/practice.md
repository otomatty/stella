# レッスン1-1 演習 — カード

対象トピック: 1-1-1 〜 1-1-4

## 手元で試す

`index.html` の `body` に、カードの骨格を置きます。

```html
<article class="card">
  <h3>社内勉強会</h3>
  <p>毎週金曜の夕方に開催しています。</p>
  <a href="/events/study">詳細を見る</a>
</article>
```

`style.css` に、4 段階のうち 2 〜 4 段階目を書きます。

```css
:root {
  --surface: oklch(99% 0 0);
  --surface-2: oklch(96% 0 0);
  --line: oklch(88% 0 0);
  --accent: oklch(55% 0.16 264);
  --space-3: 16px;
  --radius-1: 8px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-3);

  > * {
    margin-block: 0;
  }

  a {
    &:hover {
      color: var(--accent);
    }

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  }
}
```

保存して再読み込みし、枠の付いた箱の中に 3 つの中身が縦に並べば成功です。書けたら、次の改造をしてみましょう。

1. `--space-3` の値だけを `24px` に変えて、カードの内側の余白が変わることを確かめる
2. Tab キーを押して「詳細を見る」に進み、`:focus-visible` の枠が出ることを確かめる
3. `> * { margin-block: 0; }` を消して、`gap` に見出しや段落の既定の margin が足された間隔になることを確かめる(確かめたら戻す)

## 演習問題

### 問1(基本)

カードを囲む要素として `div` ではなく `article` を選ぶのは、何が変わるからですか。1 文で答えてください。

### 問2(基本)

カードの中身を縦に積み、間隔を 12px 空ける CSS を 3 行で書いてください。

### 問3(応用)

`.card { padding: 16px; }` と書いてある部分を、トークンを使った形に直してください。トークンの定義も書くこと。

### 問4(応用)

リンクに `:hover` だけを書いて `:focus-visible` を書かないと、誰にとって困りますか。1 文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`article` は「それだけ取り出しても意味が通る 1 件」だと機械にも伝わりますが、`div` は意味を持たないので見た目が同じでもその情報が伝わりません。

</details>

<details>
<summary>問2の解答例</summary>

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

</details>

<details>
<summary>問3の解答例</summary>

```css
:root {
  --space-3: 16px;
}

.card {
  padding: var(--space-3);
}
```

値を `:root` に集め、部品側は名前で参照します。この `:root` は以降のレッスンでも使い続けるので、消さずに残しておいてください。

</details>

<details>
<summary>問4の解答例</summary>

マウスを使わずキーボードで操作する利用者に、いまどこにいるのかが見えなくなって困ります。

</details>

## 確認クイズ

### Q1. この講座で部品を作る 4 段階の順番はどれですか。

- A. HTML骨格 → レイアウト → トークン → 状態
- B. トークン → HTML骨格 → 状態 → レイアウト
- C. レイアウト → 状態 → HTML骨格 → トークン

<details>
<summary>答え</summary>

**A** — 骨格を作り、並べ方を決め、色と余白を当て、最後に状態を描きます。すべての部品でこの順番です。

</details>

### Q2. カードを囲む要素に `article` を選ぶ理由はどれですか。

- A. `div` より余白が少ないから
- B. 独立した 1 件のまとまりだと機械にも伝わるから
- C. `article` にしないと CSS が当たらないから

<details>
<summary>答え</summary>

**B** — 見た目はどちらでも同じにできますが、伝わる情報が違います。

</details>

### Q3. カードの中身の間隔を親の `gap` に集める利点はどれですか。

- A. 間だけに効くので、子が増減しても崩れず先頭・末尾に余白が出ない
- B. 子ごとに違う間隔を細かく指定できる
- C. 子の既定の margin を自動で 0 にしてくれる

<details>
<summary>答え</summary>

**A** — `margin` を子ごとに書くと書き忘れが出るうえ、先頭と末尾にも余白が付いて `padding` と二重になります。なお既定の margin は消えないので、`gap` を使う前に自分で 0 にします。

</details>

### Q4. トークンの名前の付け方として適切なのはどれですか。

- A. `--surface` のように役割で付ける
- B. `--white` のように見た目で付ける
- C. `--css1` のように連番で付ける

<details>
<summary>答え</summary>

**A** — 役割で付けておくと、あとで色を変えても名前が嘘になりません。

</details>

### Q5. カードの `:hover` と `:focus-visible` は、どの要素に当てますか。

- A. カードの中の押せる要素(リンク)
- B. カードの枠そのもの
- C. `body` 全体

<details>
<summary>答え</summary>

**A** — 押せない場所の見た目が変わると、押せるように見えて期待が外れます。書く場所はカードの入れ子の中で、`:focus-visible` はキーボードで進んだときにだけ枠が出ます。

</details>
