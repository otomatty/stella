# レッスン3-1 演習 — .gitignore

対象トピック: 3-1-1 〜 3-1-4

## ハンズオン

これまで使ってきた練習用リポジトリ `~/git-practice` の続きで試します。手元の VS Code のターミナルで進めてください。

1. リポジトリへ移動して、現在地を確かめます

   ```bash
   cd ~/git-practice
   git status
   ```

2. VS Code でファイル `app.log` を新規作成し、`2026-08-19 起動テスト` と1行書いて保存します。`git status` を打つと、Untracked に app.log が出ます

3. VS Code でファイル `.gitignore` を新規作成し、次の1行を書いて保存します

   ```text
   app.log
   ```

   もう一度 `git status` を打つと、app.log が消えて、代わりに .gitignore が Untracked に出ます

4. .gitignore 自体をコミットします

   ```bash
   git add .gitignore
   git commit -m ".gitignoreを追加"
   ```

5. パターンを試します。.gitignore の中身を次の2行に書き換えて保存します

   ```text
   *.log
   logs/
   ```

   VS Code で `error.log` と、フォルダ `logs` の中に `debug.log` を作ってから `git status` を打ち、どちらも表示されないことを確かめます。確認できたら .gitignore の変更をコミットします

   ```bash
   git add .gitignore
   git commit -m "ログをパターンで無視する"
   ```

6. 最後に「追跡済みは無視されない」を体験します。VS Code で `memo.txt` を作って一度コミットします

   ```bash
   git add memo.txt
   git commit -m "メモを追加"
   ```

   .gitignore に `memo.txt` の1行を追記してから、VS Code で memo.txt を編集して保存し、`git status` を打ちます。無視されず modified に出ることを確かめてください

7. 追跡をやめて、無視が効くようにします

   ```bash
   git rm --cached memo.txt
   git commit -m "memo.txtを追跡から外す"
   git status
   ```

   memo.txt が手元に残ったまま、status に出なくなれば成功です

## 演習問題

### 問1(基本)

次のうち、.gitignore に書いて無視すべきファイルはどれですか。理由も1文で答えてください。

```text
(ア) 自分で書いたプログラム report.ts
(イ) 実行のたびに書き出される app.log
(ウ) 手順をまとめた README.md
```

### 問2(基本)

「`build` フォルダを中身ごと無視する」「`.tmp` で終わるファイルをすべて無視する」の2つを、.gitignore の2行で書いてください。

### 問3(応用)

コミット済みの `debug.log` を .gitignore に追記しましたが、編集するたびに status へ出続けます。原因と、無視されるようにするためのコマンドを答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

(イ)です。実行すればまた作り直せるログだからです。

(ア)と(ウ)は自分で書いたもので、消えたら作り直せません。履歴に記録して守るべきファイルです。

</details>

<details>
<summary>問2の解答例</summary>

```text
build/
*.tmp
```

フォルダは末尾に `/` を付けて中身ごと、まとめての指定は `*` を使ったパターンで書きます。

</details>

<details>
<summary>問3の解答例</summary>

debug.log がすでに追跡中(コミット済み)だからです。.gitignore が効くのは、まだ追跡していないファイルだけです。

```bash
git rm --cached debug.log
git commit -m "debug.logを追跡から外す"
```

`--cached` を付けているので、手元のファイルは消えません。追跡をやめた後は .gitignore が効きます。

</details>

## 確認クイズ

### Q1. .gitignore に書いたファイルの扱いとして正しいものはどれですか。

- A. コミットのたびに自動でバックアップされる
- B. Gitが無いものとして扱い、status にも add の対象にもならない
- C. ファイルがPCから削除される

<details>
<summary>答え</summary>

**B** — .gitignore は無視リストです。書かれたファイルを Git は無いものとして扱うだけで、ファイル自体はそのまま残ります。

</details>

### Q2. .gitignore に書くべきファイルの判断基準として正しいものはどれですか。

- A. ファイルの容量が大きいかどうか
- B. 消えても作り直せるかどうか
- C. 作ってから1週間以上たっているかどうか

<details>
<summary>答え</summary>

**B** — 無視するのは生成物・ログ・依存フォルダなど「作り直せるもの」です。消えたら困るものは記録します。

</details>

### Q3. 「temp フォルダを中身ごと無視する」書き方として正しいものはどれですか。

- A. temp/
- B. *.temp
- C. temp*

<details>
<summary>答え</summary>

**A** — フォルダは末尾に `/` を付けて書きます。B と C は「temp を含む名前のファイル」への指定で、フォルダごとの無視にはなりません。

</details>

### Q4. コミット済みのファイルを .gitignore に書いたのに status に出続けます。次に打つコマンドはどれですか。

- A. git add ファイル名
- B. git rm --cached ファイル名
- C. git commit -m "無視する"

<details>
<summary>答え</summary>

**B** — すでに追跡中のファイルは .gitignore に書くだけでは無視されません。`git rm --cached` で追跡をやめてからコミットすれば、以後は無視されます。

</details>
