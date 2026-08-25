# レッスン2-1 区画とカードの集合

## このレッスンの目標

- [ ] `main` の中身を、`h2` の見出しを持つ `section` で区切れる
- [ ] 区画どうしの間隔を、親の `gap` の 1 か所で決められる
- [ ] カードの集合を `repeat(auto-fill, minmax())` のグリッドで敷き詰められる

## 2-1-1 本文はsectionで区切る

> **mainの中身は、h2の見出しを持つsectionの区画で区切る**

上まわりが載ったので、本文の中身に入ります。このページの本文には「今月の勉強会」「更新情報」「参加申し込み」「よくある質問」と、話題がいくつもあります。1-1-2 で決めたとおり `main` は 1 つのままにして、話題の切れ目は `main` の中で付けます。

話題のひとまとまりを **区画** と呼び、`section` で囲みます。そして区画には必ず **見出し**(`h2`)を付けます。

```html
<main>
  <div class="wrapper">
    <h1>勉強会一覧</h1>
    <section>
      <h2>今月の勉強会</h2>
      <!-- ここにカードを並べる -->
    </section>
    <section>
      <h2>更新情報</h2>
    </section>
  </div>
</main>
```

`h1` はページ全体の題、`h2` が区画の題です。HTML/CSS 入門で学んだ「見出しの番号は飛ばさない」をページの単位で使うと、見出しの階層がそのまま本文の目次になります。

`section` と見出しはセットです。`section` だけ書くと名前の無い区画になり、見出しの一覧で移動する人には中身を開くまで何の区画か分かりません。landmark に `aria-label` で表札を付けたのと同じ理屈で、区画の表札は `h2` です。見出しを画面に出したくないデザインなら、そもそもそこに区切りが要るのかを先に見直してください。

なお `section` と `article` の使い分けは HTML/CSS 入門のとおりです。単独で成り立つ 1 件(カードの 1 枚)は `article`、ページの中の一区切りは `section`。この 2 つが、そのまま「部品」と「区画」に対応します。

## 2-1-2 区画の間隔は親のgapで空ける

> **区画どうしの間隔は、区画を積む親を縦のflexにしてgapでまとめて空ける**

区画がくっついたままだと、話題の切れ目が見た目に出ません。ここで部品講座の考え方を思い出してください。カードの中身の間隔は、子の `margin` ではなく **親の `gap` に集める**のでした。同じことをページの単位でやります。

区画を積んでいるのは `main` の中の `.wrapper` なので、そこを縦の flex にします。

```css
main .wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
```

- 間隔の持ち主は区画ではなく、区画を積んでいる **親**
- `gap` は間にだけ効くので、先頭と末尾に余計な余白が出ない
- 値は区画用の大きめの余白トークン(`--space-5`)を 1 つ決めて使う

区画ごとに `section { margin-block-end: 48px; }` と書く方法との違いも、部品のときと同じです。margin 方式は最後の区画の下にも余白が付き、書き忘れ・書きすぎが区画の数だけ起きます。親の `gap` なら、区画をあとから足しても消しても間隔は一定のままです。

パンくずや `h1` も同じ wrapper の中にあるので、それらと最初の区画の間隔もこの `gap` で決まります。ページの縦のリズムが 1 か所で決まる、というのがこの書き方の価値です。

## 2-1-3 カードの集合はgridで敷き詰める

> **カードの集合は、repeat(auto-fill, minmax())のgridで幅に合わせて敷き詰める**

最初の区画に、部品講座で作った **カード** を並べます。カードは 1 枚ずつ作りましたが、一覧では何枚も並びます。ここで列の数を 3 と決め打ちすると、狭い画面で 3 列のままカードがつぶれます。画面の幅に合わせて列の数が自動で変わる入れ物を作ります。

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}
```

```html
<section>
  <h2>今月の勉強会</h2>
  <div class="card-grid">
    <article class="card">
      <h3>TypeScript入門</h3>
      <p>毎週金曜の夕方に開催しています。</p>
      <a href="/events/ts">詳細を見る</a>
    </article>
    <article class="card">…</article>
    <article class="card">…</article>
  </div>
</section>
```

レシピは `grid-template-columns` の 1 行です。

- `repeat(auto-fill, …)` … 決めた列幅が **幅に入るだけ** 列を作る
- `minmax(220px, 1fr)` … 列は最低 220px、余った幅は `1fr` どうしで等分

幅の広い画面では 4 列、狭くなると 3 列、2 列、最後は 1 列と、**メディアクエリーを 1 本も書かずに**列数が追従します。`repeat(3, 1fr)` のような決め打ちとの違いはここです。

カード自身の HTML と CSS には手を触れていないことを確認してください。`card-grid` という入れ物を 1 枚かぶせただけです。部品と、部品を並べる入れ物は、別の仕事です。

## 2-1-4 subgridで行の高さをそろえる

> **隣のカードと行の高さをそろえたいときは、subgridで親のgridの行を借りる**

敷き詰めた直後に、たいてい 1 つ気になることが出ます。見出しが 2 行のカードと 1 行のカードが隣に並ぶと、本文の始まる高さがずれて、横のラインがガタつくことです。

原因は、カードが **自分の中で** 行の高さを決めていることです。隣のカードの事情は知らないので、中身の行数が違えばずれます。そこで、高さの持ち主をカードから親のグリッドへ移します。

```css
.card-grid > .card {
  grid-row: span 3;
  display: grid;
  grid-template-rows: subgrid;
}
```

- `grid-row: span 3` … カード 1 枚が親の 3 行ぶん(見出し・本文・リンク)を使う
- `grid-template-rows: subgrid` … カードの中の行を自分で決めず、親の **行** を借りる

親の行の高さは、同じ行に乗っているカード全員で共有されます。どれかのカードの見出しが 2 行になれば、その行全体が 2 行ぶんの高さになり、隣のカードの本文も同じ高さから始まります。

これは **任意の上積み**です。中身の行数がそろっている一覧なら無くても困りません。まず 2-1-3 のグリッドまで作り、ガタつきが気になる一覧にだけ足す、という順で使ってください。カードの中身の HTML は変えずに済みます。

## もっと知りたい人へ

- [Card(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Card)
- [Subgrid(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid)
- [文書の構造化(MDN)](https://developer.mozilla.org/ja/docs/Learn_web_development/Core/Structuring_content/Structuring_documents)

---

演習は [practice.md](practice.md) にあります。
