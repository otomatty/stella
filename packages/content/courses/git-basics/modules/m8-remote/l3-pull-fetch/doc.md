# レッスン8-3 pullとfetch

## このレッスンの目標

- [ ] git pull でリモートに増えたコミットを手元へ取り込める
- [ ] pull が fetch と merge の合わせ技であることを説明できる
- [ ] origin/main の意味を説明し、fetch で「見てから取り込む」ができる

## 8-3-1 git pullで取り込む

> **git pull で、リモートに増えたコミットを手元へ取り込む**

自分が push する間に、同僚もリモートへ push しています。リモートに増えた分を受け取らないと、手元はどんどん古くなっていきます。

リモートに増えたコミットを手元へ引き込むのが **pull**(引き寄せる)です。

```bash
git pull
```

```text
Updating a1b2c3d..e4f5a6b
Fast-forward
 README.md | 2 ++
```

この例では、同僚が README.md に加えた2行が手元にも反映されました。表示に出てくる `Fast-forward` は、マージのモジュールで学んだ「付箋が先へ進むだけ」の取り込みです。

push が「押し出す」、pull が「引き寄せる」。対になるこの2つで、リモートとのやり取りは完成します。作業を始める前に pull する習慣をつけて、手元を最新に保ちましょう。

## 8-3-2 pull = fetch + merge

> **pull は fetch(取り寄せ)と merge(取り込み)の合わせ技**

pull は魔法の同期ボタンではありません。中身は2つの動作の合成です。

![git pull の中身。リモートリポジトリから 1. fetch で手元に取り寄せ、2. merge で今いるブランチへ取り込む](t2-pull-is-fetch-merge/assets/pull-fetch-merge.svg)

- **fetch** は、リモートに増えたコミットを手元に取り寄せる動作です。取り寄せるだけで、作業中のファイルはまだ変わりません
- merge は、取り寄せた分を今いるブランチへ取り込む動作です

荷物にたとえると、玄関まで運ぶのが fetch、部屋に納めるのが merge です。

この分解が分かると、pull の途中でコンフリクトが起きる理由も説明できます。中身が merge なので、同じ箇所を互いに変えていればコンフリクトになるのです。故障ではなく、解決の手順も合流のモジュールで学んだとおりです。

## 8-3-3 origin/mainは控え

> **origin/main は「最後に確認したリモートの位置」の手元の控え**

git log を見ると、main の他に `origin/main` という名前が出てくることがあります。

```text
e4f5a6b (HEAD -> main, origin/main) 価格表を更新
```

origin/main は、リモートの main が「前回 fetch した時点で」どこまで進んでいたかを示す、手元のメモです。

```text
リモートの main:    A - B - C   (いま実際はここまで)
手元の origin/main: A - B       (最後に確認したのはここ)
手元の main:        A - B       (自分の作業位置)
```

大事なのは、origin/main が**リアルタイムの最新ではない**ことです。同僚が C を push しても、手元の origin/main は fetch するまで B のままです。あくまで「最後に確認した位置」の控えだからこそ、こまめに取り寄せる意味があります。

## 8-3-4 fetchなら見てから

> **git fetch なら、取り寄せて中身を眺めてから取り込める**

pull は取り寄せと取り込みを一気にやるので、中身を見る間がありません。「何が来るのか先に確かめてから取り込みたい」ときは、fetch を単体で使います。

```bash
git fetch
git log --oneline origin/main
```

```text
f7a8b9c (origin/main) 会員一覧に並び替えを追加
e4f5a6b 価格表を更新
```

- fetch は取り寄せるだけなので、作業中のファイルは何も変わりません
- fetch で控え(origin/main)が最新になり、来る予定の変更を log で先に読めます
- 眺めて納得したら、取り込みは pull で行えばよいのです

fetch は何度打っても手元の作業を壊さない、安全なコマンドです。普段は pull、慎重にいきたい日は fetch で先に確認、と使い分けましょう。

## もっと知りたい人へ

- [git pull — 公式リファレンス](https://git-scm.com/docs/git-pull) — pull の詳しい仕様
- [git fetch — 公式リファレンス](https://git-scm.com/docs/git-fetch) — fetch の詳しい仕様

---

演習は [practice.md](practice.md) にあります。
