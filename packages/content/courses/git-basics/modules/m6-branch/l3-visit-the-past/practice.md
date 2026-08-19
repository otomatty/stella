# レッスン6-3 演習 — 過去を見に行く

対象トピック: 6-3-1 〜 6-3-3

## ハンズオン

手元の VS Code のターミナルで、`~/git-practice` リポジトリを使って試します。コミットが2つ以上あることが前提です(これまでのレッスンを進めていれば十分あります)。

1. 練習用リポジトリへ移動し、見学先のコミットIDを調べます

```bash
cd ~/git-practice
git log --oneline
```

一覧のいちばん下(いちばん古いコミット)の先頭7桁のIDをメモしてください。

2. そのIDを指定して、過去のスナップショットを開きます

```bash
git switch --detach <メモしたID>
# HEAD is now at <ID> ...
```

3. 当時の状態を見学します

```bash
ls
git status
# HEAD detached at <ID>
```

後から作ったファイルが見えなくなり、フォルダが当時の状態になっています。`git status` の「HEAD detached at ...」が見学モードの表示です。壊れていないので、落ち着いて眺めてください。VS Code でファイルを開いて、当時の中身を読んでみましょう。

4. 見学を終えて、ブランチへ帰ります

```bash
git switch main
# Switched to branch 'main'
git status
# On branch main
ls
```

「On branch main」に戻り、ファイルも最新の状態に戻りました。「行く・読む・帰る」の3点セットを一巡できました。

## 演習問題

### 問1(基本)

`git log --oneline` で `a1b2c3d 会員一覧を追加` というコミットを見つけました。この時点のファイル一式を開くコマンドを書いてください。

### 問2(基本)

`git status` を打ったら「HEAD detached at a1b2c3d」と表示されました。この状態の説明として、後輩にどう声をかけますか。1〜2文で書いてください。

### 問3(応用)

過去のコミットを差分で読む方法(git show など)ではなく、`git switch --detach` で丸ごと開くのが向いているのはどんな場面ですか。1つ挙げてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
git switch --detach a1b2c3d
```

`--detach` を付けて、ブランチ名の代わりにコミットIDを指定します。IDは先頭7桁で十分です。

</details>

<details>
<summary>問2の解答例</summary>

「どのブランチにも居ない見学モードになっているだけで、壊れていないよ。見終わったら git switch main で戻れば大丈夫」。

detached HEAD はエラーではなく、HEADがブランチではなくコミットを直接指しているという現在地の報告です。

</details>

<details>
<summary>問3の解答例</summary>

「当時の状態で実際にファイルを開いて動きや内容を確かめたい」場面です。

差分は変わった行しか見せてくれません。当時のファイル一式そのものが必要なとき(資料を当時の形で読み返す、動作を確かめる等)は、スナップショットを丸ごと開く方が向いています。

</details>

## 確認クイズ

### Q1. 過去のコミット(ID: 3f2a9c1)の時点の状態を作業フォルダに開くコマンドはどれですか。

- A. git switch --detach 3f2a9c1
- B. git switch -c 3f2a9c1
- C. git show 3f2a9c1

<details>
<summary>答え</summary>

**A** — `--detach` 付きの git switch がコミットIDを直接開きます。git show は差分とメッセージを表示するだけで、フォルダの中身は変わりません。

</details>

### Q2. detached HEAD という表示の意味として正しいものはどれですか。

- A. リポジトリが壊れたので修復が必要
- B. どのブランチにも居ない「見学モード」に入っている
- C. コミットが1つ消えてしまった

<details>
<summary>答え</summary>

**B** — HEADがブランチ(付箋)から外れてコミットを直接指している状態の報告です。エラーでも故障でもなく、過去を眺める分には問題ありません。

</details>

### Q3. detached HEAD の状態から、いつもの状態に戻る方法はどれですか。

- A. リポジトリを作り直す
- B. ターミナルを閉じて開き直す
- C. git switch main のようにブランチへ移る

<details>
<summary>答え</summary>

**C** — 帰り方は普通のブランチ移動と同じです。ブランチ名を指定して switch すれば、HEADが付箋に戻り見学モードは終わります。

</details>

### Q4. この研修の方針として、detached HEAD(見学モード)中の過ごし方で適切なものはどれですか。

- A. ファイルを見るだけに留め、コミットは積まない
- B. 普段どおりコミットをどんどん積む
- C. 何も操作せず、すぐにPCを再起動する

<details>
<summary>答え</summary>

**A** — 見学モードでコミットを積むと、どのブランチの付箋も付かない場所にコミットができて迷子になりやすいためです。見るだけなら安全です。

</details>
