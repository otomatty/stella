# レッスン2-3 演習 — 削除と移動も変更

対象トピック: 2-3-1 〜 2-3-3

## ハンズオン

手元の VS Code のターミナルで試します。これまでのレッスンで使った `~/git-practice` の続きです。

1. 練習用のファイルを2つ用意します。VS Code で `draft.txt`(内容: `企画のたたき台`)と `old-memo.txt`(内容: `打ち合わせ用の古いメモ`)を新規作成して保存し、ターミナルでコミットしておきます

   ```bash
   cd ~/git-practice
   git add -A
   git commit -m "下書きと打ち合わせメモを追加"
   ```

2. 使い終わった下書きを git rm で削除します。`deleted:` の表示を確認してからコミットしてください

   ```bash
   git rm draft.txt
   git status
   git commit -m "古い下書きを削除"
   ```

3. レッスン2-2 で作った `price.txt` の名前を git mv で変えます。`renamed:` の表示を確認してからコミットしてください

   ```bash
   git mv price.txt price-list.txt
   git status
   git commit -m "価格表のファイル名を整理"
   ```

4. 今度は VS Code のエクスプローラ(ファイル一覧)で `old-memo.txt` を右クリックして削除します

5. git status を打ち、削除がまだ「載っていない変更」であることを確認します

   ```bash
   git status
   ```

6. git add -A で削除を拾い、`deleted:` として載ったことを確認してからコミットします

   ```bash
   git add -A
   git status
   git commit -m "古い打ち合わせメモを削除"
   ```

## 演習問題

### 問1(基本)

git rm と git mv は、それぞれどんな変更を記録するコマンドですか。1行ずつで答えてください。

### 問2(基本)

`git mv price.txt price-list.txt` を実行した直後の git status には、どんな表示が出ますか。

### 問3(応用)

同僚がエクスプローラでファイルを削除してから「git rm を使い忘れた。削除を記録できない」と困っています。次に打つコマンドと、その後の流れを説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

- git rm: 「このファイルを消した」という削除の変更を記録する
- git mv: 「名前を変えた・移動した」という変更を記録する

どちらも書き換え以外の変更を、次のコミットに入るように載せてくれます。

</details>

<details>
<summary>問2の解答例</summary>

`renamed: price.txt -> price-list.txt` のように、古い名前と新しい名前が矢印でつながった表示が出ます。

これが「移動が変更として載った」印で、あとは commit すれば記録が残ります。

</details>

<details>
<summary>問3の解答例</summary>

git add -A を打てば、削除が変更として拾われます。その後 git status で `deleted:` を確認し、いつも通り commit すれば削除が記録されます。

消し方が git rm でもエクスプローラでも、最終的に記録される内容は同じです。

</details>

## 確認クイズ

### Q1. 「このファイルを消した」という変更を、削除と同時に載せてくれるコマンドはどれですか。

- A. git rm ファイル名
- B. git mv ファイル名
- C. git diff ファイル名

<details>
<summary>答え</summary>

**A** — git rm はファイルを消すのと同時に、削除を次のコミットに入る変更として載せます。mv は移動、diff は変更を読むコマンドです。

</details>

### Q2. ファイル名を price.txt から price-list.txt に変えたことを記録したいとき、最初に打つコマンドはどれですか。

- A. git rm price.txt
- B. git mv price.txt price-list.txt
- C. git add price.txt

<details>
<summary>答え</summary>

**B** — git mv は「名前を変えた・移動した」という変更を載せるコマンドです。あとは commit すれば記録が残ります。

</details>

### Q3. エクスプローラでファイルを削除してしまいました(git rm は使っていません)。削除を記録するために次に打つコマンドはどれですか。

- A. git add -A
- B. git mv
- C. 記録する方法はない

<details>
<summary>答え</summary>

**A** — git add -A が削除も含めて変更を全部載せてくれます。git rm を使い忘れても、記録できなくなるわけではありません。

</details>

### Q4. git add -A の -A オプションの意味として正しいものはどれですか。

- A. 削除された行だけを載せる
- B. 削除も含めて、変更を全部載せる
- C. 直前のコミットを取り消す

<details>
<summary>答え</summary>

**B** — -A は All(全部)の意味で、書き換えも削除もまとめて載せます。載せた後の流れはいつも通り commit です。

</details>
