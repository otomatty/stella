# レッスン2-1 演習 — ファイルを作る・移す・消す

対象トピック: 2-1-1 〜 2-1-5

## 手元で試す

**このレッスンは消す操作を含みます。必ず練習用のディレクトリの中だけで行ってください。**

```bash
cd ~
mkdir -p cli-practice/sandbox
cd cli-practice/sandbox
pwd                       # ここが練習場所であることを確かめる
```

作る・複製する・移す、を順に試します。

```bash
mkdir -p data/2026/04     # 途中の階層ごと作る
touch data/2026/04/report.csv
ls -R data                # 作られた形を確かめる

cp data/2026/04/report.csv report-backup.csv
mv report-backup.csv data/backup.csv
ls data
```

最後に、消す操作を確認つきで試します。

```bash
ls data                   # 1. 消す前に対象を見る
rm -i data/backup.csv     # 2. 確認に y と答える
ls data                   # 3. 消えたことを確かめる
```

練習用ディレクトリの片付けも、`ls` で確かめてから行ってください。

```bash
cd ~/cli-practice
ls sandbox
rm -r sandbox
```

## 演習問題

### 問1(基本)

`work/2026/report` という3階層のディレクトリを、1コマンドで作ってください。

### 問2(基本)

`config.json` を直す前に、同じ場所に `config.json.bak` という名前でバックアップを作るコマンドを書いてください。

### 問3(応用)

`draft.md` を `archive` ディレクトリに移動し、同時に名前を `2026-04.md` に変えるコマンドを書いてください。

### 問4(応用)

`rm` と GUI の「ごみ箱に入れる」操作の違いを1文で説明し、消す前に踏むべき確認手順を1つ挙げてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
mkdir -p work/2026/report
```

`-p` は途中の階層をまとめて作ります。付けないと、`work` が無い時点でエラーになります。

</details>

<details>
<summary>問2の解答例</summary>

```bash
cp config.json config.json.bak
```

`cp` は「元 → 先」の順です。順番を逆にすると、残したかった元のファイルを失います。

</details>

<details>
<summary>問3の解答例</summary>

```bash
mv draft.md archive/2026-04.md
```

`mv` は移動と改名を同時に行えます。行き先のパスに新しい名前まで書くだけです。

</details>

<details>
<summary>問4の解答例</summary>

- 違い: `rm` はごみ箱に入らず、そのまま消えるため元に戻せません。
- 確認手順: 消す前に `ls` で対象を表示して、消す対象が想定どおりか目で確かめます(不安なら `rm -i` で1件ずつ確認する)。

</details>

## 確認クイズ

### Q1. `mkdir -p data/2026/04` の `-p` の説明として正しいものはどれですか。

- A. 途中の階層(`data` や `2026`)も一緒に作る
- B. 作ったディレクトリに移動する
- C. 権限を変更する

<details>
<summary>答え</summary>

**A** — `-p` は親ディレクトリもまとめて作ります。既に存在していてもエラーにならない性質もあります。

</details>

### Q2. `touch notes.md` を、既に中身のある `notes.md` に対して実行するとどうなりますか。

- A. 中身が消えて空になる
- B. 中身はそのままで、更新日時が新しくなる
- C. エラーになる

<details>
<summary>答え</summary>

**B** — `touch` は既存ファイルの中身を壊しません。無ければ空で作り、あれば日時だけ更新します。

</details>

### Q3. `cp report.csv backup/` を実行したとき、`report.csv` はどうなりますか。

- A. 元の場所に残る
- B. 元の場所から消える
- C. 名前が変わる

<details>
<summary>答え</summary>

**A** — `cp` は複製なので元は残ります。元が残らないのは `mv` です。

</details>

### Q4. 同じ場所でファイルの名前だけを変えたいとき、使うコマンドはどれですか。

- A. `cp`
- B. `mv`
- C. `touch`

<details>
<summary>答え</summary>

**B** — `mv` は移動と改名を兼ねます。行き先に新しい名前を書けば、その場で名前が変わります。

</details>

### Q5. `rm` の説明として正しいものはどれですか。

- A. 消したファイルはごみ箱に入り、後から戻せる
- B. 消す前に必ず確認が表示される
- C. 消したファイルは戻せない。`-i` を付けると1件ずつ確認できる

<details>
<summary>答え</summary>

**C** — `rm` はごみ箱を経由せず、確認も出ません。心配なときは `-i` を付け、実行前に `ls` で対象を確かめます。

</details>
