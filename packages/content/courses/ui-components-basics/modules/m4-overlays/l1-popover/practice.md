# レッスン4-1 演習 — ポップオーバー

対象トピック: 4-1-1 〜 4-1-4

## 手元で試す

`index.html` に、ヘッダーのメニューを置きます。

```html
<button popovertarget="menu">メニュー</button>

<div id="menu" popover>
  <a href="/profile">プロフィール</a>
  <a href="/logout">ログアウト</a>
</div>
```

`style.css` に次を足します。トークン(`--line` / `--radius-1` / `--space-2` など)はレッスン1-1 で `:root` に定義したものです。まだなら先に足してください。

```css
[popover] {
  inset: auto;
  inset-block-start: 64px;
  inset-inline-end: 16px;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-2);
  background-color: var(--surface);
  box-shadow: 0 8px 24px oklch(0% 0 0 / 0.15);

  &:popover-open {
    border-color: var(--accent);
  }
}
```

ボタンを押すとメニューが右上に出れば成功です。開かないときは、対応していないブラウザーの可能性があります。その場合は書いた内容の確認までに留めてください(代わりに動く JavaScript は書きません)。書けたら、次の改造をしてみましょう。

1. メニューを開いた状態で Esc キーを押し、閉じることを確かめる
2. メニューの外側をクリックして、閉じることを確かめる
3. ボタンを押して開いたあと Tab を 1 回押し、フォーカスがメニューの中へ進むことを確かめる(開いた時点ではボタンに残っています)
4. 最初のリンクに `autofocus` を足して、開いた瞬間にそこへフォーカスが当たることを確かめる
5. `inset` から `margin: 0` までの 4 行を消して、画面中央に出ることを確かめる

## 演習問題

### 問1(基本)

ポップオーバーを作るのに必要な 2 つの属性を挙げてください。

### 問2(基本)

`details` では実現できず、ポップオーバーならできることは何ですか。

### 問3(応用)

`inset-block-start` と `inset-inline-end` だけを書いて位置がずれました。ほかに何を書く必要がありますか。

### 問4(応用)

重ねて出す部品で `background-color` を必ず指定するのはなぜですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

出したい要素に付ける `popover` と、ボタンに付ける `popovertarget` です。`popovertarget` の値は相手の `id` にします。

</details>

<details>
<summary>問2の解答例</summary>

他の要素の上に重ねて出すことです。ポップオーバーは最前面の層に出ます。

</details>

<details>
<summary>問3の解答例</summary>

`inset: auto` で既定の中央寄せを解き、`margin: 0` で自動マージンを消す必要があります。

</details>

<details>
<summary>問4の解答例</summary>

背景が透明のままだと、下に重なっている文字が透けて読めなくなるからです。

</details>

## 確認クイズ

### Q1. ポップオーバーを開くボタンに書く属性はどれですか。

- A. `popovertarget`
- B. `popover`
- C. `commandfor`

<details>
<summary>答え</summary>

**A** — 出したい要素の `id` を値にします。要素側には `popover` を書きます。

</details>

### Q2. `popover` 属性を付けた要素に既定で付いてくるふるまいはどれですか。

- A. 一定時間で自動的に閉じる
- B. 外側のクリックと Esc キーで閉じる
- C. 開いた瞬間に中の要素へフォーカスが移る

<details>
<summary>答え</summary>

**B** — 自分で書くと難しい部分が既定で手に入ります。フォーカスは開いてもボタンに残り、Tab で中へ進みます。すぐ移したいときは `autofocus` を書きます。

</details>

### Q3. ポップオーバーが最前面に出ることの利点はどれですか。

- A. 親の `overflow: hidden` に切られず、`z-index` の争いにもならない
- B. ページの読み込みが速くなる
- C. 画面の幅を自動で埋める

<details>
<summary>答え</summary>

**A** — 重なりの制御から解放されます。

</details>

### Q4. ポップオーバーの位置を変えるとき、`inset: auto` を先に書くのはなぜですか。

- A. 既定の中央寄せをいったん解くため
- B. 影を消すため
- C. 開閉の速度を変えるため

<details>
<summary>答え</summary>

**A** — `margin: 0` もセットで書かないと、自動マージンが残って位置がずれます。

</details>

### Q5. 開いている間だけ見た目を変えるセレクタはどれですか。

- A. `[popover]:hover`
- B. `[popover]:popover-open`
- C. `[popover][open]`

<details>
<summary>答え</summary>

**B** — `details` の `[open]` に当たる、ポップオーバー版の状態セレクタです。

</details>
