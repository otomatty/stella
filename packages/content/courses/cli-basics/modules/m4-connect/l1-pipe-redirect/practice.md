# レッスン4-1 演習 — パイプとリダイレクト

対象トピック: 4-1-1 〜 4-1-5

## 手元で試す

練習用のログを用意します。

```bash
mkdir -p ~/cli-practice/logs
cd ~/cli-practice
printf '10:01 info started\n10:03 error timeout\n10:05 error refused\n10:07 warn slow\n' > logs/app.log
```

パイプでつなぎます。

```bash
grep error logs/app.log              # まず結果を見る
grep error logs/app.log | wc -l      # その件数を数える
cat logs/app.log | head -n 2         # 先頭2行だけ
```

リダイレクトで書き出します。`>` と `>>` の違いを目で確かめてください。

```bash
grep error logs/app.log > errors.txt
cat errors.txt

grep warn logs/app.log > errors.txt   # 置き換わる
cat errors.txt                        # error の行は消えている

grep error logs/app.log >> errors.txt # 追記される
cat errors.txt                        # warn と error が両方ある
```

最後に、出口が2つあることを確かめます。

```bash
cat nofile.txt > out.txt      # エラーは画面に出る
cat out.txt                   # 空
cat nofile.txt 2> error.txt   # エラーがファイルに入る
cat error.txt
```

## 演習問題

### 問1(基本)

`logs/app.log` の中の `error` を含む行が何件あるかを、1行のコマンドで数えてください。

### 問2(基本)

`grep error logs/app.log` の結果を `errors.txt` に書き出すコマンドを書いてください。

### 問3(応用)

毎日の実行結果を `daily.txt` に積み上げたい場合、`>` と `>>` のどちらを使いますか。理由も書いてください。

### 問4(応用)

`grep error app.log > result.txt` を実行したところ、画面に `grep: app.log: No such file or directory` と表示されました。`result.txt` の中身はどうなっていますか。理由も説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
grep error logs/app.log | wc -l
```

`grep` の標準出力が、パイプで `wc` の標準入力につながります。`wc -l` が受け取った行数を数えます。

</details>

<details>
<summary>問2の解答例</summary>

```bash
grep error logs/app.log > errors.txt
```

`>` は標準出力の行き先をファイルに変えます。画面には何も出ませんが、失敗ではありません。

</details>

<details>
<summary>問3の解答例</summary>

`>>` を使います。

`>` は既にある内容を置き換えるため、実行するたびに前日までの記録が消えてしまいます。`>>` は末尾に書き足すので、記録が積み上がります。

</details>

<details>
<summary>問4の解答例</summary>

`result.txt` は空になります。

エラーメッセージは標準エラー出力へ流れており、`>` が向きを変えるのは標準出力だけだからです。`result.txt` はいったん作られますが、書き込まれる内容がありません。エラーもファイルに残したいときは `2> error.txt` を足します。

</details>

## 確認クイズ

### Q1. 標準出力の説明として正しいものはどれですか。

- A. コマンドが結果を流す出口で、既定の行き先が画面
- B. キーボードからの入力だけを指す
- C. エラーメッセージ専用の出口

<details>
<summary>答え</summary>

**A** — 画面は既定の行き先にすぎず、パイプやリダイレクトで差し替えられます。エラー専用の出口は標準エラー出力です。

</details>

### Q2. `grep error app.log | wc -l` の説明として正しいものはどれですか。

- A. `grep` の結果をファイルに保存してから数える
- B. `grep` の標準出力を `wc` の標準入力につなぎ、該当行の件数を出す
- C. `grep` と `wc` を別々に実行する

<details>
<summary>答え</summary>

**B** — パイプは左の出口を右の入口に直結します。ファイルは作られません。

</details>

### Q3. 既にある `errors.txt` に対して `grep warn app.log > errors.txt` を実行するとどうなりますか。

- A. 末尾に追記される
- B. 元の中身が置き換わる
- C. 上書きしてよいか確認される

<details>
<summary>答え</summary>

**B** — `>` は置き換えです。確認は出ません。追記したいときは `>>` を使います。

</details>

### Q4. `>` と `>>` の違いとして正しいものはどれですか。

- A. `>` は追記、`>>` は置き換え
- B. `>` は置き換え、`>>` は追記
- C. どちらも同じ動作をする

<details>
<summary>答え</summary>

**B** — `>` は中身を置き換え、`>>` は末尾に書き足します。消えて困るファイルには `>>` を選びます。

</details>

### Q5. コマンドの出口が標準出力と標準エラー出力の2つに分かれている理由として、最も適切なものはどれですか。

- A. 正常な結果と異常の知らせを混ぜないため
- B. 画面の表示を速くするため
- C. ファイルの容量を節約するため

<details>
<summary>答え</summary>

**A** — 混ざっていると、パイプでつないだ集計にエラーメッセージが紛れ込んでしまいます。分けることで結果だけを次の処理へ渡せます。

</details>
