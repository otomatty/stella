# レッスン4-1 演習 — logを使いこなす

対象トピック: 4-1-1 〜 4-1-4

これまで使ってきた練習用リポジトリ `~/git-practice` の続きで演習します。

## ハンズオン

VS Code のターミナルで、読みごたえのある履歴を作ってから読んでいきます。

1. 練習用リポジトリへ移動します

   ```bash
   cd ~/git-practice
   git status
   ```

2. VS Code で `price.txt` を作り(既にあれば開き)、次の内容にして保存します

   ```text
   コーヒー
   紅茶
   ```

3. コミットします

   ```bash
   git add price.txt
   git commit -m "価格表を作成"
   ```

4. `price.txt` の「コーヒー」の行を「コーヒー 450円」に直して保存し、コミットします

   ```bash
   git add price.txt
   git commit -m "価格表に単価を追記"
   ```

5. VS Code で `memo.txt` を新規作成し、「打ち合わせ 8/20 10:00」と1行書いて保存し、コミットします

   ```bash
   git add memo.txt
   git commit -m "打ち合わせメモを追加"
   ```

6. まず素の log で履歴を読みます。一番上が最新(打ち合わせメモ)であることを確かめてください。表示が長ければ `q` で抜けます

   ```bash
   git log
   ```

7. 1行1コミットの一覧にします。短いハッシュとメッセージが並ぶことを確かめてください

   ```bash
   git log --oneline
   ```

8. `price.txt` の履歴だけに絞ります。メモのコミットが出てこないことを確かめてください

   ```bash
   git log --oneline price.txt
   ```

9. 差分ごと読みます。「価格表に単価を追記」のコミットに `-コーヒー` と `+コーヒー 450円` が見えたら成功です。`q` で抜けます

   ```bash
   git log -p price.txt
   ```

## 演習問題

### 問1(基本)

履歴を「1行1コミット」の一覧で表示するコマンドを書いてください。

### 問2(基本)

`report.txt` というファイルを変えたコミットだけを表示するコマンドを書いてください。

### 問3(応用)

「価格表に単価を追記」というコミットで、実際にどの行が変わったのかを履歴の画面で確かめたいです。各コミットの差分も一緒に表示するコマンドを書いてください。

### 問4(応用)

`git log --oneline` の各行に表示される2つの情報は何ですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
git log --oneline
```

1行1コミットに圧縮された一覧になります。並び順は git log と同じで、一番上が最新です。

</details>

<details>
<summary>問2の解答例</summary>

```bash
git log report.txt
```

log の後ろにファイル名を添えると、そのファイルを変えたコミットだけに絞れます。`git log --oneline report.txt` のように組み合わせても構いません。

</details>

<details>
<summary>問3の解答例</summary>

```bash
git log -p
```

各コミットの下に差分が続けて表示されます。`+` が追加された行、`-` が削除された行です。`git log -p price.txt` と絞ればさらに探しやすくなります。

</details>

<details>
<summary>問4の解答例</summary>

短縮されたハッシュと、コミットメッセージ(の1行目)です。

短いハッシュはコミットを指す目印としてそのまま使えます。

</details>

## 確認クイズ

### Q1. git log の表示順として正しいものはどれですか。

- A. 一番上が最新のコミットで、下へ行くほど過去になる
- B. 一番上が最古のコミットで、下へ行くほど新しくなる
- C. コミットメッセージの五十音順に並ぶ

<details>
<summary>答え</summary>

**A** — git log は履歴を新しい順に表示します。一番上が最新、下へ読み進めるほど過去へさかのぼります。

</details>

### Q2. git log --oneline の表示として正しいものはどれですか。

- A. 各コミットの差分が1行ずつ表示される
- B. 短いハッシュとコミットメッセージが1行1コミットで表示される
- C. 最新の1件だけが表示される

<details>
<summary>答え</summary>

**B** — --oneline は1コミットを「短いハッシュ + メッセージ」の1行に圧縮します。全体の流れをざっと見渡すのに向きます。

</details>

### Q3. price.txt の履歴だけを表示するコマンドはどれですか。

- A. git log --price.txt
- B. git status price.txt
- C. git log price.txt

<details>
<summary>答え</summary>

**C** — log の後ろにファイル名を添えると、そのファイルを変えたコミットだけに絞れます。status は今の状態を見るコマンドで、履歴は表示しません。

</details>

### Q4. git log -p で表示されるものとして正しいものはどれですか。

- A. 各コミットのメッセージに加えて、そのコミットの差分
- B. まだコミットしていない作業中の変更
- C. コミットした人の一覧

<details>
<summary>答え</summary>

**A** — -p(patch)を付けると、各コミットの下にそのコミットの差分が続けて表示されます。作業中の変更を見るのは git diff の役割です。

</details>
