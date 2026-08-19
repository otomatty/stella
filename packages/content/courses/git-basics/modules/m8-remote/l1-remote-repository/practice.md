# レッスン8-1 演習 — リモートリポジトリ

対象トピック: 8-1-1 〜 8-1-5

## ハンズオン

自分の GitHub アカウントで練習用リポジトリを作り、手元に clone してみましょう。手元の VS Code のターミナルで試します。GitHub アカウントが無い場合は、手順を読んで流れを理解するだけでかまいません(以降のレッスンも同様です)。

1. ブラウザで GitHub にログインし、「New repository」を選びます
2. リポジトリ名に `git-practice-remote` と入力します
3. 「Add a README file」にチェックを入れて、「Create repository」を押します(最初から README が1つ入った状態になります)
4. できたリポジトリのページで「Code」ボタンを押し、HTTPS の URL をコピーします
5. VS Code のターミナルを開き、ホームフォルダなど作業しやすい場所へ移動します

   ```bash
   cd ~
   ```

6. コピーした URL で clone します(URL は自分のものに置き換えてください)

   ```bash
   git clone https://github.com/自分のアカウント名/git-practice-remote.git
   ```

7. できたフォルダに入り、中身と履歴を確かめます

   ```bash
   cd git-practice-remote
   ls
   git log --oneline
   ```

8. どのリモートと繋がっているかを確かめます

   ```bash
   git remote -v
   ```

   origin として、コピーした URL が2行表示されれば成功です。この練習用リポジトリは次のレッスン以降でも使うので、消さずに残しておきましょう。

## 演習問題

### 問1(基本)

リモートリポジトリを置く目的を、「共有」以外にもう1つ挙げてください。

### 問2(基本)

`git clone URL` を実行すると、手元には何がコピーされますか。「最新のファイル」以外に含まれるものを答えてください。

### 問3(応用)

同僚から「その origin ってどこのリポジトリのこと?」と聞かれました。origin とは何かを1文で説明し、それを確かめるコマンドを答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

PCが壊れてもリモートに履歴が残る、という保険(バックアップ)の役割です。

手元のリポジトリだけだと、PCの故障で作業フォルダと履歴がまとめて消えます。リモートに送ってあれば、そこから clone し直せます。

</details>

<details>
<summary>問2の解答例</summary>

過去の履歴です。

clone は最新のファイルだけでなく、リモートの履歴をまるごと手元にコピーします。全員が完全な履歴のコピーを手元に持つ、という分散型の性質そのものです。

</details>

<details>
<summary>問3の解答例</summary>

origin は clone 元のリモートに自動で付く呼び名で、確かめるコマンドは `git remote -v` です。

origin がどの URL を指しているかは `git remote -v` の対応表で確認できます。

</details>

## 確認クイズ

### Q1. リモートリポジトリの説明として正しいものはどれですか。

- A. 手元のリポジトリを高速化するためのキャッシュ
- B. 共有のために GitHub 上に置く、もう1つのリポジトリ
- C. 履歴を持たない、最新ファイルだけの置き場

<details>
<summary>答え</summary>

**B** — リモートは共有のために GitHub 上に置くもう1つのリポジトリです。中身は手元のリポジトリと同じく履歴を持ちます。

</details>

### Q2. GitHub 上のリポジトリを手元にコピーしたいとき、次に打つコマンドはどれですか。

- A. git clone URL
- B. git init URL
- C. git remote URL

<details>
<summary>答え</summary>

**A** — リモートを履歴ごと手元にコピーするのは git clone URL です。init は手元で新しくリポジトリを作るコマンドでした。

</details>

### Q3. origin の説明として正しいものはどれですか。

- A. リポジトリの最初のコミットに付く特別な名前
- B. 自分で必ず手動登録しなければならないリモートの設定
- C. clone 元のリモートに自動で付く呼び名

<details>
<summary>答え</summary>

**C** — origin は clone すると自動で付く、clone 元リモートの呼び名です。以後は URL の代わりに origin と書けます。

</details>

### Q4. いま繋がっているリモートの呼び名と URL の対応を確かめたいとき、次に打つコマンドはどれですか。

- A. git status
- B. git remote -v
- C. git log --oneline

<details>
<summary>答え</summary>

**B** — リモートの対応表を表示するのは git remote -v です。status は作業の状態、log は履歴を見るコマンドです。

</details>
