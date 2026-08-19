# レッスン6-4 演習 — 作業の一時退避

対象トピック: 6-4-1 〜 6-4-4

## ハンズオン

手元の VS Code のターミナルで、`~/git-practice` リポジトリを使って試します。「切り替えを止められる → stash でしのぐ → pop で戻す」を一巡します。

1. main に居ることを確かめてから、練習用のメモを作ってコミットします

```bash
cd ~/git-practice
git branch
# * main
```

VS Code で `memo.md` を新規作成し、次の内容で保存します。

```text
# 打ち合わせメモ たたき台
- 参加者: 佐藤、田中
```

```bash
git add memo.md
git commit -m "打ち合わせメモを追加"
```

2. 作業用ブランチで memo.md に追記し、コミットします

```bash
git switch -c polish-memo
```

`memo.md` の末尾に `- 決定事項: 単価を改定する` を追記して保存し、コミットします。

```bash
git add memo.md
git commit -m "決定事項を追記"
git switch main
```

これで memo.md は、main と polish-memo で中身が違う状態になりました。

3. main で memo.md を編集途中のまま、切り替えを試します

VS Code で `memo.md` の1行目を `# 打ち合わせメモ(整理中)` に変えて保存します(コミットはしません)。そのまま切り替えを試します。

```bash
git switch polish-memo
# error: Your local changes to the following files
# would be overwritten by checkout:
#   memo.md
```

止められました。未コミットの変更が上書きで消えそうなので、Git が守ってくれています。

4. stash で退避して、手元をきれいにします

```bash
git stash
# Saved working directory and index state WIP on main: ...
git status
# nothing to commit, working tree clean
```

5. きれいになったので、切り替えて用事を済ませます

```bash
git switch polish-memo
ls
git switch main
```

polish-memo を見に行って、main へ帰ってこられました。

6. 退避した変更を取り出して、コミットに昇格させます

```bash
git stash pop
# Changes not staged for commit:
#   modified:   memo.md
git add memo.md
git commit -m "メモの見出しを整理"
```

編集途中だった変更が戻り、区切りが付いたのでコミットに昇格させました。stash に長居させない、まで含めて一巡です。

## 演習問題

### 問1(基本)

`git switch` が「error: Your local changes ... would be overwritten」と表示して止まりました。Git は何を守るために止まったのですか。

### 問2(基本)

編集途中の変更を退避して手元をきれいにするコマンドと、退避した変更を作業フォルダに戻すコマンドを、それぞれ書いてください。

### 問3(応用)

「stash に入れたまま数日置いておく」使い方が勧められないのはなぜですか。コミットとの違いに触れて説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

コミットしていない変更(まだどこにも記録されていない変更)を守るためです。

switch は作業フォルダの中身を移り先のブランチの状態に入れ替えます。そのまま進むと未コミットの変更が上書きで消えてしまうため、Git が切り替えを断りました。

</details>

<details>
<summary>問2の解答例</summary>

退避するのは `git stash`、戻すのは `git stash pop` です。

stash でしまうと手元は最後のコミットの状態に戻り、ブランチを切り替えられるようになります。pop で取り出すと、編集途中のファイルがそのままの姿で帰ってきます。

</details>

<details>
<summary>問3の解答例</summary>

stash の中身にはコミットのような「いつ・何を・なぜ」のメッセージ付きの記録が残らず、日が経つと自分でも思い出せなくなるからです。

stash は割り込みをしのぐ一時置きに留め、用が済んだら pop で出して、区切りが付き次第コミットに昇格させます。

</details>

## 確認クイズ

### Q1. 未コミットの変更があるときに git switch が止まることがあるのはなぜですか。

- A. 変更が上書きで消えないように Git が守っているから
- B. 1日に切り替えられる回数が決まっているから
- C. ブランチが3本以上あると切り替えられないから

<details>
<summary>答え</summary>

**A** — switch はフォルダの中身を入れ替えるため、未コミットの変更が消えそうな場合は切り替えを断ります。エラーは保護であって故障ではありません。

</details>

### Q2. 作業中の変更をいったん退避して、手元をきれいにするコマンドはどれですか。

- A. git stash
- B. git restore
- C. git commit -m "退避"

<details>
<summary>答え</summary>

**A** — git stash が変更を退避場所へしまい、手元を最後のコミットの状態に戻します。restore は変更を捨ててしまうので別物です。

</details>

### Q3. git stash pop が行うことはどれですか。

- A. 退避した変更を削除する
- B. 退避した変更を作業フォルダに戻し、退避場所から取り出す
- C. 新しいブランチを作る

<details>
<summary>答え</summary>

**B** — pop は「出して、退避場所からは消す」動きです。編集途中だったファイルがそのままの姿で帰ってきます。

</details>

### Q4. stash の使い方として適切なものはどれですか。

- A. 完成した作業の保管庫として何週間も入れておく
- B. 割り込みをしのぐ一時置きにして、早めにコミットへ昇格させる
- C. コミットの代わりに毎日の記録として使う

<details>
<summary>答え</summary>

**B** — stash は一時置きです。メッセージ付きの記録が残るのはコミットだけなので、区切りが付いたら add して commit で昇格させます。

</details>
