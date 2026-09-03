# レッスン3-1 演習 — ファイルと中身を探す

対象トピック: 3-1-1 〜 3-1-4

## 手元で試す

練習用のログを用意します。

```bash
mkdir -p ~/cli-practice/logs
cd ~/cli-practice
printf '10:01 info started\n10:03 error timeout\n10:05 ERROR refused\n' > logs/app.log
printf '10:02 info connected\n10:07 warn slow query\n' > logs/db.log
```

`grep` で探します。オプションの違いを見比べてください。

```bash
grep error logs/app.log       # 小文字の error だけ
grep -i error logs/app.log    # ERROR も拾う
grep -n error logs/app.log    # 行番号が付く
grep -rn error logs/          # logs 配下を全部。ファイル名も出る
grep zzz logs/app.log         # 一致なし。何も出ないのが正常
```

`find` で名前から探します。

```bash
find . -name "*.log"          # 引用符あり
find . -type f                # ファイルだけ一覧
```

最後に、展開の違いを目で確かめます。

```bash
cd ~/cli-practice/logs
echo *.log                    # シェルが展開した結果が見える
echo "*.log"                  # 引用符で囲むと展開されない
```

## 演習問題

### 問1(基本)

`app.log` の中から、大文字小文字を区別せずに `error` を含む行を、行番号付きで取り出すコマンドを書いてください。

### 問2(基本)

`logs` ディレクトリの下にあるすべてのファイルから `timeout` を含む行を探すコマンドを書いてください。

### 問3(応用)

`grep` と `find` は、それぞれ何を手がかりに探す道具ですか。1文ずつで説明してください。

### 問4(応用)

`echo *.log` を実行すると `app.log db.log` と表示されました。`echo` はファイルを検索する機能を持っていません。なぜこの結果になったのか説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
grep -in error app.log
```

`-i` で大文字小文字を無視し、`-n` で行番号を付けます。オプションは `-in` のようにまとめて書けます。

</details>

<details>
<summary>問2の解答例</summary>

```bash
grep -r timeout logs/
```

`-r` はディレクトリの中を再帰的にたどります。どのファイルの何行目かまで知りたいときは `-rn` にします。

</details>

<details>
<summary>問3の解答例</summary>

- `grep`: ファイルの**中身**(含まれる文字列)を手がかりに、該当する行を取り出します。
- `find`: ファイルの**名前**(や種類)を手がかりに、条件に合うファイルを探します。

</details>

<details>
<summary>問4の解答例</summary>

`echo` にコマンドが渡る前に、シェルが `*.log` を実際のファイル名へ展開しているためです。

`echo` が受け取ったのは `app.log db.log` という2つの引数で、それをそのまま表示しただけです。展開はコマンドの機能ではなく、シェルの機能です。

</details>

## 確認クイズ

### Q1. `grep error app.log` の説明として正しいものはどれですか。

- A. `app.log` の中から `error` を含む行を取り出す
- B. `error` という名前のファイルを探す
- C. `app.log` の中の `error` を別の文字に置き換える

<details>
<summary>答え</summary>

**A** — `grep` は中身を探し、一致した行を表示します。名前で探すのは `find` です。

</details>

### Q2. `ERROR` と大文字で書かれた行も拾いたいときに付けるオプションはどれですか。

- A. `-n`
- B. `-i`
- C. `-r`

<details>
<summary>答え</summary>

**B** — `-i`(ignore case)で大文字小文字を区別しなくなります。`-n` は行番号、`-r` は再帰的な検索です。

</details>

### Q3. `find . -name "*.log"` の `.` は何を指していますか。

- A. 隠しファイル
- B. 探す対象の拡張子
- C. 探し始める場所(カレントディレクトリ)

<details>
<summary>答え</summary>

**C** — `find` は探す場所を先に書きます。`.` はカレントディレクトリなので、いまいる場所の下を探します。

</details>

### Q4. `find . -name "*.log"` で条件を引用符で囲む理由はどれですか。

- A. シェルに展開されるのを防ぎ、`find` 自身に条件として解釈させるため
- B. 引用符が無いと `find` が動かないため
- C. 大文字小文字を区別しないようにするため

<details>
<summary>答え</summary>

**A** — 引用符が無いと、シェルが先に `*.log` をファイル名へ展開してしまいます。`find` には条件のまま渡す必要があります。

</details>

### Q5. ワイルドカード `*` を処理しているのは誰ですか。

- A. 実行されるコマンド自身
- B. シェル
- C. ターミナル

<details>
<summary>答え</summary>

**B** — シェルが実行前に展開し、コマンドは展開後の結果を受け取ります。ターミナルは文字をやり取りする窓で、展開はしません。

</details>
