# レッスン2-1 演習 — 変更→確認→記録のサイクル

対象トピック: 2-1-1 〜 2-1-4

## ハンズオン

手元の VS Code のターミナルで試します。Module 1 の演習で作った練習用リポジトリ `~/git-practice` の続きです。

1. 練習用リポジトリに移動します

   ```bash
   cd ~/git-practice
   ```

2. 練習用の日報ファイルを用意します。VS Code で `nippou.txt` を新規作成し、次の1行を書いて保存します(ファイルの作成・編集はターミナルではなく VS Code のエディタで行います)

   ```text
   2/16 会員一覧の資料を作成
   ```

   保存したら、ターミナルでコミットして編集する土台を用意します

   ```bash
   git add nippou.txt
   git commit -m "日報ファイルを追加"
   ```

3. VS Code で `nippou.txt` を開き、2行目に `2/17 資料のレビュー対応` と追記して保存します

4. 状態を確かめます。`modified: nippou.txt` と表示されることを確認してください

   ```bash
   git status
   ```

5. 変更の中身を読みます。追記した行が `+` 付きで表示されることを確認してください

   ```bash
   git diff
   ```

6. 基本サイクルの残りを回して記録します

   ```bash
   git add nippou.txt
   git commit -m "日報に2/17の作業を追記"
   ```

7. もう一度 `git status` を打ち、modified の表示が消えたことを確かめます

## 演習問題

### 問1(基本)

一度コミットした `nippou.txt` を編集して保存しました。このとき `git status` に表示される状態の名前と、その意味を答えてください。

### 問2(基本)

次の diff の表示から、何をどう変えたのかを説明してください。

```text
-担当: 佐藤
+担当: 田中
+期限: 3月末
```

### 問3(応用)

「編集 → status → diff → add → commit」のサイクルで、add の前に status と diff を挟むのはなぜですか。1〜2文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

modified(変更あり)です。コミット済みのファイルの中身が、最後のコミットと違っていることを表します。

新しいファイルに付く Untracked とは別の状態です。どちらも故障ではなく、status が今の状態を教えてくれています。

</details>

<details>
<summary>問2の解答例</summary>

担当を「佐藤」から「田中」に書き換え、「期限: 3月末」という行を新しく追加しています。

`-` と `+` がペアで並ぶ行は書き換え、`+` だけの行は追加です。

</details>

<details>
<summary>問3の解答例</summary>

何をどう変えたかを自分の目で確かめてから記録するためです。読まずに add・commit すると、意図しない変更まで記録してしまうことがあります。

</details>

## 確認クイズ

### Q1. コミット済みのファイルを編集して保存した後、git status に表示される状態はどれですか。

- A. Untracked
- B. modified
- C. 何も表示されない

<details>
<summary>答え</summary>

**B** — コミット済みのファイルに変更があると modified(変更あり)になります。Untracked は「Gitがまだ見ていない新しいファイル」に付く表示です。

</details>

### Q2. 「どのファイルが変わったか」ではなく「中のどの行がどう変わったか」を確かめたいとき、次に打つコマンドはどれですか。

- A. git diff
- B. git status
- C. git log

<details>
<summary>答え</summary>

**A** — git diff は編集した箇所だけを抜き出して表示します。status はファイル名まで、log は積み上がったコミットの一覧です。

</details>

### Q3. diff の表示で、行頭の - と + の意味の組み合わせとして正しいものはどれですか。

- A. - がエラーの行、+ が正しい行
- B. - が変更後、+ が変更前
- C. - が変更前、+ が変更後

<details>
<summary>答え</summary>

**C** — マイナスの行が変更前(消えた内容)、プラスの行が変更後(新しく書かれた内容)です。

</details>

### Q4. 日々の基本サイクルの順番として正しいものはどれですか。

- A. 編集 → add → commit → status → diff
- B. 編集 → status → diff → add → commit
- C. 編集 → commit → add → diff → status

<details>
<summary>答え</summary>

**B** — 確認の2つ(status と diff)を真ん中に挟んでから、add で選んで commit で記録します。「読まずに記録しない」が型の意味です。

</details>
