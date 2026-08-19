# レッスン8-3 演習 — pullとfetch

対象トピック: 8-3-1 〜 8-3-4

## ハンズオン

「リモート側だけが先に進む」状況を自分で作って、fetch と pull を試します。練習用リポジトリ `git-practice-remote` と、手元の VS Code のターミナルを使います。GitHub アカウントが無い場合は、手順を読んで流れを理解するだけでかまいません。

1. ブラウザで GitHub の `git-practice-remote` を開き、README.md を選んで鉛筆マーク(Edit)を押します
2. 1行追記して、そのまま画面下のボタンでコミットします(これで「同僚が push した」のと同じ状況になりました)
3. VS Code のターミナルで練習用リポジトリに移動します

   ```bash
   cd ~/git-practice-remote
   git switch main
   ```

4. まず fetch で取り寄せて、来る予定の変更を眺めます

   ```bash
   git fetch
   git log --oneline origin/main
   ```

   いま追記したコミットが origin/main の側に見えます。手元の README.md を開くと、まだ変わっていないことも確かめてください(fetch は取り寄せるだけ)

5. 納得したら pull で取り込みます

   ```bash
   git pull
   ```

6. 手元の README.md を開き、追記した1行が反映されたことを確かめます

7. もう一度 `git log --oneline` を打ち、main と origin/main が同じコミットを指していることを確かめます

## 演習問題

### 問1(基本)

`git pull` を分解すると、どの2つの動作の組み合わせになりますか。それぞれの役割も1文で書いてください。

### 問2(基本)

`git fetch` を実行した直後、作業中のファイルの中身は変わりますか。理由も答えてください。

### 問3(応用)

`git log --oneline` を打ったところ、次のように表示されました。この状態から分かることを1つ書いてください。

```text
f7a8b9c (origin/main) 会員一覧に並び替えを追加
e4f5a6b (HEAD -> main) 価格表を更新
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

fetch と merge です。fetch はリモートに増えたコミットを手元に取り寄せる動作、merge はそれを今いるブランチへ取り込む動作です。

pull はこの2つを続けて行う合わせ技です。だから pull の途中でコンフリクトが起きることもあります(中身が merge のため)。

</details>

<details>
<summary>問2の解答例</summary>

変わりません。fetch は取り寄せるだけで、手元のブランチに合流させないからです。

更新されるのは origin/main などの「控え」だけです。作業中のファイルに反映するのは、そのあとの pull(または merge)の仕事です。

</details>

<details>
<summary>問3の解答例</summary>

リモートの main には、手元の main にまだ取り込んでいないコミット(会員一覧に並び替えを追加)がある、ということが分かります。

fetch 済みで origin/main が手元の main より先に居る状態です。pull すれば追いつけます。

</details>

## 確認クイズ

### Q1. リモートに増えたコミットを手元のブランチへ取り込みたいとき、次に打つコマンドはどれですか。

- A. git push
- B. git pull
- C. git clone

<details>
<summary>答え</summary>

**B** — リモートに増えた分を手元へ取り込むのは git pull です。push は逆方向、clone は最初にまるごとコピーするときのコマンドです。

</details>

### Q2. git pull の中身の説明として正しいものはどれですか。

- A. fetch(取り寄せ)と merge(取り込み)を続けて行う
- B. リモートのファイルを1つずつダウンロードして上書きする
- C. 手元の履歴を削除してリモートの履歴で置き換える

<details>
<summary>答え</summary>

**A** — pull は fetch と merge の合わせ技です。中身が merge なので、同じ箇所を互いに変えているとコンフリクトも起きます。

</details>

### Q3. origin/main の説明として正しいものはどれですか。

- A. リモートの main の、常にリアルタイムで最新の姿
- B. 最後に確認したリモートの位置を示す、手元の控え
- C. main のバックアップとして自動で作られる別ブランチ

<details>
<summary>答え</summary>

**B** — origin/main は「前回 fetch した時点でリモートの main がどこに居たか」の控えです。fetch するまで更新されません。

</details>

### Q4. リモートの変更を「先に中身を眺めてから」取り込みたいとき、最初に打つコマンドはどれですか。

- A. git fetch
- B. git pull
- C. git push -u origin main

<details>
<summary>答え</summary>

**A** — まず git fetch で取り寄せれば、作業中のファイルを変えずに log などで中身を確かめられます。納得してから pull で取り込みます。

</details>
