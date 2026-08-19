# レッスン8-2 演習 — push

対象トピック: 8-2-1 〜 8-2-4

## ハンズオン

前のレッスンで clone した練習用リポジトリ `git-practice-remote` に、コミットを積んで push してみましょう。手元の VS Code のターミナルで試します。GitHub アカウントが無い場合は、手順を読んで流れを理解するだけでかまいません。

1. 練習用リポジトリに移動します

   ```bash
   cd ~/git-practice-remote
   ```

2. 練習用のファイルを作り、コミットします。VS Code で `practice.txt` を新規作成し、`push の練習メモ` と書いて保存してから、ターミナルでコミットします

   ```bash
   git add practice.txt
   git commit -m "練習用のメモを追加"
   ```

3. この時点で GitHub のリポジトリページを開き、practice.txt が**まだ無い**ことを確かめます(コミットは手元だけ、を体感するステップです)

4. push します

   ```bash
   git push
   ```

   初回は本人確認(認証)を求められることがあります。パスワード入力欄にはログインパスワードではなくトークンを貼ります。設定方法が分からない場合は、無理に進めず「認証が要る」ことだけ確認して読み進めてください

5. GitHub のページを開き直し、practice.txt が現れたことを確かめます

6. 新しいブランチでも試します

   ```bash
   git switch -c add-memo
   ```

   VS Code で `practice.txt` の末尾に `ブランチからの push 練習` の1行を追記して保存し、コミットして push します。

   ```bash
   git add practice.txt
   git commit -m "ブランチからメモを追記"
   git push -u origin add-memo
   ```

   GitHub のページでブランチの切り替えメニューを開くと、add-memo が増えています。2回目以降は `git push` だけで届くことも、もう一度コミットして確かめてみましょう

## 演習問題

### 問1(基本)

ファイルを編集して上書き保存しただけの状態で `git push` を打ちました。この変更はリモートに届きますか。理由も答えてください。

### 問2(基本)

手元で新しく作ったブランチ `fix-layout` を初めてリモートへ送るときのコマンドを書いてください。

### 問3(応用)

後輩が「GitHub のログインパスワードを打ったのに push が失敗する」と困っています。原因と対処を説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

届きません。push が送るのはコミットだけだからです。

保存しただけの変更はまだコミットになっていません。add して commit し、コミットにしてから push すると届きます。

</details>

<details>
<summary>問2の解答例</summary>

`git push -u origin fix-layout` です。

新しいブランチはリモートの送り先が未登録なので、初回だけ -u で紐づけます。2回目からは `git push` だけで届きます。

</details>

<details>
<summary>問3の解答例</summary>

GitHub への push はログインパスワードでは認証できないためです。トークンを発行してパスワード欄に貼るか、SSH 鍵を設定します。

どちらの手段を使うかは現場のルールに従います。一度設定すれば毎回は聞かれません。

</details>

## 確認クイズ

### Q1. 手元で積んだコミットをリモートへ送りたいとき、次に打つコマンドはどれですか。

- A. git push
- B. git commit
- C. git add .

<details>
<summary>答え</summary>

**A** — 手元のコミットをリモートへ送るのは git push です。add と commit は手元に記録を作る操作で、送る操作ではありません。

</details>

### Q2. 手元で新しく作ったブランチ topic を初めて push するときの正しいコマンドはどれですか。

- A. git push topic origin
- B. git push -u origin topic
- C. git push --all

<details>
<summary>答え</summary>

**B** — 新しいブランチの初回は git push -u origin 枝名 で送り先を紐づけます。紐づけた後は git push だけで届きます。

</details>

### Q3. 「push したのにリモートに変更が見えない」ときに、まず疑うべきことはどれですか。

- A. リモートリポジトリが自動で削除された
- B. push には1日の回数制限がある
- C. 変更がまだコミットになっていない

<details>
<summary>答え</summary>

**C** — push が送るのはコミットだけです。保存や add で止まっている変更は送られないので、status で commit まで済んでいるかを確かめます。

</details>

### Q4. GitHub へ push するときの本人確認(認証)について、正しいものはどれですか。

- A. トークンや SSH 鍵を使う(ログインパスワードでは push できない)
- B. GitHub のログインパスワードを毎回入力する
- C. 認証は不要で、誰でも自由に push できる

<details>
<summary>答え</summary>

**A** — GitHub はパスワードでの push を受け付けません。トークンか SSH 鍵で認証します。共有の置き場だからこそ本人確認が必須です。

</details>
