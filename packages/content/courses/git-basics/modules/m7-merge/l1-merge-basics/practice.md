# レッスン7-1 演習 — マージの基本

対象トピック: 7-1-1 〜 7-1-5

## ハンズオン

手元の VS Code のターミナルで、fast-forward とマージコミットの両方を体験します。これまでのレッスンで使ってきた `~/git-practice` リポジトリを使います。

もし `~/git-practice` が無い場合は、先に作っておきます(ファイルの作成・編集はターミナルではなく VS Code のエディタで行います)。

```bash
cd ~
mkdir git-practice && cd git-practice
git init
```

VS Code で `practice.txt` を新規作成し、`練習用ファイル` と書いて保存したら、コミットしておきます。

```bash
git add practice.txt
git commit -m "練習用ファイルを作成"
```

### 1. fast-forward を体験する

1. リポジトリへ移動し、手元がきれいなことを確かめます。

   ```bash
   cd ~/git-practice
   git status
   # nothing to commit, working tree clean なら OK
   ```

2. 作業用ブランチを作って移り、変更を1つ積みます。

   ```bash
   git switch -c add-schedule
   ```

   VS Code で `practice.txt` の末尾に `予定: 金曜に定例ミーティング` の1行を追記して保存し、コミットします。

   ```bash
   git add practice.txt
   git commit -m "定例の予定を追記"
   ```

3. 取り込む側の main へ移ってからマージします。

   ```bash
   git switch main
   git merge add-schedule
   ```

   出力に `Fast-forward` と表示されることを確かめてください。main 側に新しいコミットが無かったので、付箋が進むだけで合流できました。

4. `git log --oneline` で、main の先頭が「定例の予定を追記」になったことを確かめます。

### 2. マージコミットを体験する

1. 作業用ブランチで価格表ファイルを作ります。

   ```bash
   git switch -c add-price
   ```

   VS Code で `price.txt` を新規作成し、`単価: 1,200円` と書いて保存したら、コミットします。

   ```bash
   git add price.txt
   git commit -m "価格表を作成"
   ```

2. main へ戻り、**別のファイル**にも変更を積んで、わざと二股にします。

   ```bash
   git switch main
   ```

   VS Code で `memo.txt` を新規作成し、`会議メモ: 次回は価格を相談` と書いて保存したら、コミットします。

   ```bash
   git add memo.txt
   git commit -m "会議メモを追加"
   ```

3. main に居るまま、add-price をマージします。メッセージ入力画面が開かないよう -m を付けます。

   ```bash
   git merge add-price -m "価格表の作成を取り込む"
   ```

   今度は `Fast-forward` ではなく、マージコミットが作られたことを示す出力(`Merge made by ...`)になります。

4. 履歴の形を確かめます。

   ```bash
   git log --graph --oneline
   ```

   線が二股に分かれて1点に戻り、先頭にマージコミットがあることを確かめてください。ブランチはまだ消さずに残しておきます(後始末は後のレッスンで扱います)。

## 演習問題

### 問1(基本)

作業用ブランチ `fix-header` の変更を main へ取り込みたいとき、打つコマンドを順番に2つ書いてください。

### 問2(基本)

fast-forward のマージと、マージコミットが作られるマージは、何が違いますか。「枝の形」に触れて説明してください。

### 問3(応用)

`fix-header` に居るまま `git merge main` と打ってしまいました。何が起きたか、そして main の履歴はどうなっているかを説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
git switch main
git merge fix-header
```

merge は「取り込む側」で実行します。受け皿は今いる枝なので、まず main へ移り、それから枝名を指定してマージします。

</details>

<details>
<summary>問2の解答例</summary>

枝が一直線なら fast-forward になり、新しいコミットは作られず、ブランチ(付箋)が先端まで進むだけで終わります。

枝が二股に育っている(両方の枝にそれぞれ新しいコミットがある)場合は、両方を親に持つマージコミットが1つ作られて、二股が束ねられます。

</details>

<details>
<summary>問3の解答例</summary>

main の変更が fix-header へ取り込まれました。向きが逆です。

merge の受け皿は「今いる枝」なので、fix-header に居て打てば fix-header が受け皿になります。main の履歴は1つも進んでいません。main へ入れたいなら、git switch main で移ってから git merge fix-header を打ち直します。

</details>

## 確認クイズ

### Q1. ブランチ fix-typo の変更を main へ取り込みたいとき、正しい手順はどれですか。

- A. fix-typo に居るまま git merge main を打つ
- B. main へ移ってから git merge fix-typo を打つ
- C. どちらの枝に居ても git merge と打てばよい

<details>
<summary>答え</summary>

**B** — merge は取り込む側で実行します。受け皿は「今いる枝」なので、main へ入れるなら main に移ってから枝名を指定します。

</details>

### Q2. マージの出力に Fast-forward と表示されました。何が起きましたか。

- A. 新しいコミットは作られず、ブランチ(付箋)が枝の先端まで進んだ
- B. 両方の枝の変更を合わせた新しいコミットが作られた
- C. マージに失敗して、元の状態に戻された

<details>
<summary>答え</summary>

**A** — 枝が一直線だったので、付箋を早送りするだけで合流が完了しました。コミットは1つも増えていません。

</details>

### Q3. マージコミットの特徴として正しいものはどれですか。

- A. コミットメッセージを持たない
- B. 親のコミットを持たない
- C. 親のコミットを2つ持つ

<details>
<summary>答え</summary>

**C** — マージコミットは二股の先端の両方を親に持ちます。普通のコミット(親1つ)との一番の違いです。

</details>

### Q4. 枝分かれと合流の形を線付きで確かめたいとき、打つコマンドはどれですか。

- A. git log --graph --oneline
- B. git status --graph
- C. git branch --oneline

<details>
<summary>答え</summary>

**A** — --graph は log のオプションで、履歴を線(グラフ)付きで表示します。--oneline と組み合わせるのが定番です。

</details>
