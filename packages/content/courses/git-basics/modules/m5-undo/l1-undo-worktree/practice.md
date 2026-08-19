# レッスン5-1 演習 — コミット前のやり直し

対象トピック: 5-1-1 〜 5-1-4

## ハンズオン

これまでのレッスンで使ってきた `~/git-practice` リポジトリの続きで試します。手元の VS Code のターミナルで進めてください。まだ無い場合は、前のモジュールのハンズオンを先に済ませてください。

`practice.txt` はこれまでの演習で使ってきたファイルです。無ければ VS Code で新しく作り、`git add practice.txt` と `git commit -m "practice.txt を追加"` で一度コミットしてから始めます。

1. `cd ~/git-practice` で移動し、`git status` で手元がきれいなことを確かめます
2. `practice.txt` の末尾に `restore の練習` と1行追記して保存します(add はまだしません)
3. `git status` で modified になっていること、`git diff practice.txt` で追記した行が `+` で見えることを確かめます
4. `git restore practice.txt` を打ち、ファイルを開き直して追記が消えたことを確かめます。`git status` もきれいに戻っています
5. もう一度 `practice.txt` に `--staged の練習` と1行追記して保存し、今度は `git add practice.txt` します
6. `git restore --staged practice.txt` を打ちます。`git status` で add が取り消されたこと、`git diff practice.txt` で編集は残っていることを確かめます
7. 最後に `git status` → `git diff practice.txt` → `git restore practice.txt` の3点セットで、確認してから手元をきれいに戻します

手順4と7で捨てた行は取り戻せません。練習用の1行だから安心して捨てられますが、実務では必ず手順7のように status と diff で確かめてから捨てます。

## 演習問題

### 問1(基本)

`会員一覧.md` を編集しているうちに壊してしまいました。まだコミットしていません。最後にコミットした状態へ戻すコマンドを書いてください。

### 問2(基本)

`価格表.md` を間違えて add してしまいました。編集した中身は残したまま、次のコミットから外すコマンドを書いてください。

### 問3(応用)

`git restore` を打つ前に確かめるべきことは何ですか。確認に使うコマンドを2つ挙げて説明してください。

### 問4(応用)

restore で捨てたコミット前の変更が取り戻せないのはなぜですか。「Git が守っている範囲」という観点で1〜2文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
git restore 会員一覧.md
```

作業中の変更を捨てて、そのファイルを最後にコミットした状態に戻します。指定したファイルだけが戻り、履歴は変わりません。

</details>

<details>
<summary>問2の解答例</summary>

```bash
git restore --staged 価格表.md
```

`--staged` を付けると、ステージングエリア(次のコミットの下書き)から降ろすだけになります。ファイルの中身は変わりません。

</details>

<details>
<summary>問3の解答例</summary>

「restore で何が消えるのか」を確かめます。使うのは `git status` と `git diff` の2つです。

- `git status` — どのファイルが変わっているかを一覧する
- `git diff ファイル名` — これから捨てる変更の中身を読む

diff を読んで「消してよい」と言えたときだけ restore を打ちます。

</details>

<details>
<summary>問4の解答例</summary>

Git が守っているのはコミットした変更だけだからです。コミット前の編集は履歴のどこにも記録されておらず、restore で捨てると戻す手段がありません。

</details>

## 確認クイズ

### Q1. 編集して壊した 日報.md(コミット前)を最後のコミットの状態に戻すコマンドはどれですか。

- A. git restore 日報.md
- B. git add 日報.md
- C. git diff 日報.md

<details>
<summary>答え</summary>

**A** — git restore ファイル名 で、作業中の変更を捨てて最後にコミットした状態へ戻せます。add は下書きに載せる操作、diff は変更を読む操作です。

</details>

### Q2. git restore --staged 価格表.md を実行したときの説明として正しいものはどれですか。

- A. 価格表.md の編集内容も含めて、すべて最後のコミットに戻る
- B. add だけが取り消され、ファイルの中身は変わらない
- C. 価格表.md がフォルダから削除される

<details>
<summary>答え</summary>

**B** — --staged はステージングエリアから降ろすだけです。編集した中身はそのまま残るので、選び直してから add し直せます。

</details>

### Q3. git restore で捨てたコミット前の変更について、正しいものはどれですか。

- A. ゴミ箱に残っているので、いつでも取り戻せる
- B. 取り戻せない(Git が守るのはコミットした変更だけ)
- C. 24時間以内なら取り戻せる

<details>
<summary>答え</summary>

**B** — コミット前の編集は履歴のどこにも記録されていません。restore で捨てたら戻せないので、迷う変更は先にコミットして残します。

</details>

### Q4. git restore を打つ直前の行動として、このレッスンで学んだ型はどれですか。

- A. まず restore を打ち、結果を見てから考える
- B. status と diff で「何が消えるのか」を確かめてから打つ
- C. ファイルのコピーを別フォルダに作ってから打つ

<details>
<summary>答え</summary>

**B** — restore は取り戻せない操作なので、status でファイルを一覧し、diff で捨てる変更の中身を読んでから実行します。

</details>
