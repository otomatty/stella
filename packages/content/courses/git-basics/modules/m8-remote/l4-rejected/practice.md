# レッスン8-4 演習 — pushが拒否されたら

対象トピック: 8-4-1 〜 8-4-3

## ハンズオン

rejected をわざと発生させて、正しい対処を体験します。練習用リポジトリ `git-practice-remote` と、手元の VS Code のターミナルを使います。GitHub アカウントが無い場合は、手順を読んで流れを理解するだけでかまいません。

1. ブラウザで GitHub の `git-practice-remote` を開き、README.md を鉛筆マーク(Edit)で1行追記してコミットします(リモートだけが先へ進んだ状況を作ります)
2. VS Code のターミナルで練習用リポジトリに移動します(**pull はまだしない**のがポイントです)

   ```bash
   cd ~/git-practice-remote
   git switch main
   ```

3. 手元でも別のファイルを変更してコミットします。VS Code で `practice.txt` の末尾に `rejected の練習` の1行を追記して保存してから、ターミナルでコミットします

   ```bash
   git add practice.txt
   git commit -m "練習メモを追記"
   ```

4. push してみます

   ```bash
   git push
   ```

   `! [rejected]` を含む表示が出て断られます。落ち着いて表示を読み、「リモートに自分の知らないコミットがある」という意味であることを確かめてください

5. 正しい対処をします

   ```bash
   git pull
   git push
   ```

   pull でリモートの先行分が手元に合流し、push が今度は成功します

6. `git log --oneline` で、GitHub 上で追記したコミットと手元のコミットが両方積まれていることを確かめます

## 演習問題

### 問1(基本)

push が rejected されました。これは何が起きている合図ですか。「壊れた」以外の言葉で説明してください。

### 問2(基本)

rejected された直後に打つべきコマンドを、順番に2つ書いてください。

### 問3(応用)

rejected を検索したら「`git push --force` で通せる」と書かれた記事を見つけました。共有ブランチでこれを実行してはいけない理由を説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

リモートが自分より先へ進んでいる(自分の知らないコミットがリモートにある)という合図です。

自分の作業中に同僚が push しただけの、チーム開発では日常的な出来事です。上書き事故を防ぐために Git がわざと止めてくれています。

</details>

<details>
<summary>問2の解答例</summary>

`git pull` → `git push` の順です。

まず pull でリモートの先行分を手元に合流させ、それから push し直します。pull でコンフリクトが出たら、編集 → add → commit で解決してから push します。

</details>

<details>
<summary>問3の解答例</summary>

強制 push はリモートの履歴を自分の履歴で上書きするため、リモートにしかない他人のコミットが消えてしまうからです。

rejected は他人のコミットを守る安全装置であり、--force はそれを手で外す操作です。正しい対処は pull してから push し直すことです。

</details>

## 確認クイズ

### Q1. push したら「! [rejected]」と表示されました。この状況の説明として正しいものはどれですか。

- A. リポジトリが壊れたので、clone からやり直す必要がある
- B. リモートが自分より先へ進んでいるので、Git が上書きを止めてくれた
- C. 認証に失敗したので、トークンを作り直す必要がある

<details>
<summary>答え</summary>

**B** — rejected は「リモートにあなたの知らないコミットがある」という合図です。上書き事故を防ぐ安全装置で、壊れてはいません。

</details>

### Q2. rejected された直後に打つコマンドの組み合わせとして正しいものはどれですか。

- A. git pull してから git push
- B. git push をもう一度繰り返す
- C. git commit --amend してから git push

<details>
<summary>答え</summary>

**A** — 先に pull でリモートの先行分を取り込んで合流させれば、push は通ります。同じ push を繰り返しても何度でも断られます。

</details>

### Q3. 強制 push(git push --force)を共有ブランチで使ってはいけない理由はどれですか。

- A. 実行にとても時間がかかるから
- B. リモートの履歴を上書きして、他人のコミットを消し得るから
- C. 一度使うと二度と push できなくなるから

<details>
<summary>答え</summary>

**B** — 強制 push は rejected という安全装置を外し、リモートを自分の履歴で上書きします。リモートにしかない同僚のコミットは消えてしまいます。

</details>
