# レッスン9-3 マージと後片付け

## このレッスンの目標

- [ ] PR のマージを GitHub 上で行う理由と操作を説明できる
- [ ] マージ後に手元の main を最新へ追いつかせる手順を実行できる
- [ ] マージ済みブランチをリモートと手元の両方で片付けられる

## 9-3-1 PRのマージはGitHub上で

> **PR のマージは GitHub 上のボタンで行う**

レビューが終わり、取り込んでよい状態になりました。Module 7 では手元で `git merge` を打ちましたが、PR の世界ではマージの場所が変わります。手元でマージして push するのではなく、GitHub の PR 画面で完結させます。

```text
1. PR 画面下部の「Merge pull request」を押す
2. 「Confirm merge」で確定
3. 表示が Merged になり、main に取り込まれる
```

GitHub 上でマージする理由は、記録の残り方にあります。

- どの PR が、いつ、誰の操作で main に入ったかがそのまま残る
- レビューのやりとりと取り込みの記録が、PR という1か所に紐づく
- 後から「この変更はなぜ入ったのか」を PR をたどって調べられる

手元でマージして push しても結果の main は同じですが、この紐づけが残りません。PR で始めた作業は PR のボタンで締める、と覚えてください。押す前にレビューが完了しているかを確認するのがマナーです。

## 9-3-2 マージ後は追いつく

> **マージ後は手元の main を pull して、リモートに追いつく**

マージボタンを押しても、変わったのはリモートのリポジトリだけです。手元の main はマージ前のまま止まっています。リモートと手元は別物である、という Module 8 の感覚をここで思い出してください。

古い main のまま次の作業を始めると、手元とリモートのずれがどんどん広がります。マージの直後に、この2つを打つのを習慣にしましょう。

```bash
git switch main
git pull
# → GitHub でマージした結果が手元の main に入る
```

「マージしたら pull」はセットの動作です。この習慣には、自分の PR のとき以外にも効き目があります。チームの誰かの PR がマージされた後も、同じ2つで手元の main を最新にできます。次の作業を必ず最新の main から始められる状態を保つ、というのがこの1手の目的です。

## 9-3-3 済んだ枝は消す

> **マージ済みのブランチはリモートでも手元でも消して、次の作業へ移る**

マージが済んだブランチは、もう役目を終えています。消さずに置いておくと、ブランチ一覧が古い枝だらけになり、「この枝はまだ作業中なのか?」と毎回考えることになります。

安心して消してよい根拠ははっきりしています。変更の中身はすでに main に入っているので、ブランチという目印を消しても何も失われません。

```bash
# リモート側: マージ後の PR 画面で「Delete branch」を押す
# 手元側:
git switch main
git branch -d update-practice-note
```

- リモート側は、マージ直後の PR 画面に出る「Delete branch」ボタンで消します
- 手元側は、Module 7 で学んだ `git branch -d` で消します。`-d` はマージ済みでないブランチの削除を拒否してくれる、安全な削除でした

ブランチ一覧に「生きている作業」だけが並んでいる状態を保つこと。これが後片付けのゴールです。片付けが済んだら、最新の main から次のブランチを切って、また新しい PR の1周が始まります。

## もっと知りたい人へ

- [プルリクエストのマージ — GitHub 公式ドキュメント](https://docs.github.com/ja/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request) — Merge pull request ボタンの公式解説
- [ブランチの削除と復元 — GitHub 公式ドキュメント](https://docs.github.com/ja/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/deleting-and-restoring-branches-in-a-pull-request) — PR 画面からのブランチ削除の操作
- [git branch — 公式リファレンス](https://git-scm.com/docs/git-branch) — `-d` の動作の正確な仕様

---

演習は [practice.md](practice.md) にあります。
