# レッスン6-2 演習 — ブランチを行き来する

対象トピック: 6-2-1 〜 6-2-4

## ハンズオン

手元の VS Code のターミナルで、`~/git-practice` リポジトリを使って試します。

1. 練習用リポジトリへ移動し、現在地を確かめます

```bash
cd ~/git-practice
git branch
# * main
```

まだブランチは main の1本だけで、`*` もそこに付いているはずです。

2. 日報テンプレートを足す作業用に、ブランチを作って移ります

```bash
git switch -c add-template
# Switched to a new branch 'add-template'
git branch
#   main
# * add-template
```

`*` が add-template に移ったことを確かめてください。

3. VS Code で `template.md` を新規作成し、次の内容を書いて保存します

```text
# 日報テンプレート
- 今日やったこと:
- 明日やること:
```

4. コミットの前に現在地を確かめてから、コミットします

```bash
git branch
# * add-template   ← ここに積まれる
git add template.md
git commit -m "日報テンプレートを追加"
git log --oneline
```

log の先頭に、いまのコミットが見えます。

5. main へ移って、手元とログの変化を観察します

```bash
git switch main
# Switched to branch 'main'
ls
git log --oneline
```

`template.md` がフォルダから見えなくなり、log からもいまのコミットが消えています。main にはまだ無い状態だからです。

6. 作業ブランチへ戻ります

```bash
git switch add-template
ls
```

`template.md` が戻ってきました。ブランチを移ると、フォルダの中身がそのブランチの状態になることを体で確かめられました。

## 演習問題

### 問1(基本)

`git branch` を打ったら次のように表示されました。いま居るブランチはどれですか。

```text
  add-template
  fix-typo
* main
```

### 問2(基本)

「価格表を直す」作業を始めます。`fix-price` というブランチを作って、そこへ移るコマンドを1行で書いてください。

### 問3(応用)

add-template ブランチで作った `template.md` が、main に移ったら見えなくなりました。ファイルは消えてしまったのでしょうか。理由も添えて答えてください。

### 問4(応用)

コミットを打つ直前に `git branch` を打つ習慣には、どんな効果がありますか。1文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

main です。

行頭に `*` が付いている行が、いま自分の居るブランチです。

</details>

<details>
<summary>問2の解答例</summary>

```bash
git switch -c fix-price
```

`-c` は「作ってから移る」のオプションです。作成と移動が1コマンドで済みます。

</details>

<details>
<summary>問3の解答例</summary>

消えていません。main の最新コミットに `template.md` が無いので、見えなくなっているだけです。

ブランチを移ると、Git が作業フォルダの中身をそのブランチの状態に入れ替えます。add-template に戻れば、ファイルはまた現れます。

</details>

<details>
<summary>問4の解答例</summary>

コミットの行き先(今いるブランチ)を積む前に確かめられるので、別のブランチに積んでしまう事故を防げます。

コミットは「今いるブランチ」にしか積まれないため、現在地の確認がそのまま行き先の確認になります。

</details>

## 確認クイズ

### Q1. いまあるブランチの一覧と現在地を確かめるコマンドはどれですか。

- A. git branch
- B. git switch
- C. git log --oneline

<details>
<summary>答え</summary>

**A** — git branch がブランチを一覧し、今いる場所に `*` を付けて示します。見るだけのコマンドなので何度打っても安全です。

</details>

### Q2. 新しいブランチ add-search を作って、そのままそこへ移るコマンドはどれですか。

- A. git switch add-search
- B. git switch -c add-search
- C. git branch add-search

<details>
<summary>答え</summary>

**B** — `-c` 付きの git switch が「作ってから移る」です。`-c` なしの git switch は既にあるブランチへの移動になります。

</details>

### Q3. git switch main でブランチを移った直後、作業フォルダはどうなりますか。

- A. 中身は何も変わらない
- B. 中身が main の最新コミットの状態に入れ替わる
- C. フォルダが main という名前に変わる

<details>
<summary>答え</summary>

**B** — 移った先のブランチの状態に、Git がファイルを入れ替えます。見えなくなったファイルも消えてはおらず、元のブランチに戻れば現れます。

</details>

### Q4. コミットが積まれる場所の説明として正しいものはどれですか。

- A. 常に main に積まれる
- B. コミットするたびに積む先を選ぶ画面が出る
- C. 今いるブランチに積まれる

<details>
<summary>答え</summary>

**C** — コミットは「今いるブランチ」に積まれ、その付箋が1つ進みます。だからコミットの前に git branch で現在地を確かめる習慣が効きます。

</details>
