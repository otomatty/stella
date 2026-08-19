# レッスン1-3 演習 — ステージに載せる

対象トピック: 1-3-1 〜 1-3-5

## ハンズオン

前のレッスンで作った `~/git-practice` の続きです。practice.txt が Untracked のまま残っているところから始めます。

1. VS Codeのターミナルで練習用リポジトリへ移動し、現状を確かめます

    ```bash
    cd ~/git-practice
    git status
    ```

    `Untracked files:` に practice.txt が出ているはずです
2. practice.txt を次の記録に入れるものとして選びます

    ```bash
    git add practice.txt
    git status
    ```

    practice.txt が「次の記録に入る」側の欄に移りました。これがステージングエリアに載った状態です
3. VS Codeで新しいファイル `memo.txt` を作り、1行書いて保存します

    ```text
    今日の作業メモ
    ```

    `git status` を打つと、memo.txt が Untracked に出ます
4. 今度はまとめて載せる書き方を試します。必ず status で挟みます

    ```bash
    git status
    git add .
    git status
    ```

    memo.txt もステージングエリアに載り、Untracked の欄が消えました
5. 最後に落とし穴を自分で踏んでみます。VS Codeで practice.txt に1行追記して保存します

    ```text
    Git練習用のメモ
    addの後に追記した行
    ```

    ```bash
    git status
    ```

    practice.txt が「載った分」と「載っていない分」の**両方の欄**に表示されます。壊れていません。add した時点の内容と、その後の編集が別々にあるだけです
6. 追記した分も下書きに入れて、状態をそろえます

    ```bash
    git add practice.txt
    git status
    ```

これでステージングエリアに下書きがそろいました。この状態のまま、次のレッスンで記録を確定します。

## 演習問題

### 問1(基本)

Gitの記録が「2段階」に分かれているのはなぜですか。add と commit それぞれの役割に触れながら説明してください。

### 問2(基本)

ステージングエリアとは何ですか。「下書き」という言葉を使って1文で説明してください。

### 問3(応用)

`git add .` を打つ前に `git status` で中身を確かめるべきなのはなぜですか。起こりうる事故を1つ挙げて説明してください。

### 問4(応用)

`git add nippou.txt` を打った後、nippou.txt にさらに2行追記して保存しました。この2行を次の記録に入れるには、どうすればよいですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

作業中の変更から「今回の記録に入れる分」を選べるようにするためです。add が次の記録に入れるものを選び、commit が選んだ分を記録として確定します。

選ぶ段階がないと、試し書きのメモまで混ざった雑多な記録になってしまいます。

</details>

<details>
<summary>問2の解答例</summary>

ステージングエリアは、add で選んだ変更が commit を待つ「次のコミットの下書き」置き場です。

下書きなので、確定前なら差し替えも追加もできます。変更は「作業フォルダ → ステージングエリア → 履歴」の順に進みます。

</details>

<details>
<summary>問3の解答例</summary>

`git add .` は今いるフォルダ以下の変更を全部載せるので、載せるつもりのないファイル(試し書きのメモや一時ファイルなど)まで記録の下書きに紛れ込む事故が起きるためです。

「status → add . → status」の3点セットを型にすると、この事故を防げます。

</details>

<details>
<summary>問4の解答例</summary>

もう一度 `git add nippou.txt` を打ちます。

add はその瞬間の内容を載せる操作なので、後から編集した分は自動では載りません。status に同じファイルが2つの欄に出ていたら、それが「もう一度 add」のサインです。

</details>

## 確認クイズ

### Q1. Gitの記録の2段階の説明として正しいものはどれですか。

- A. add で記録が確定し、commit で選び直す
- B. add で次の記録に入れる分を選び、commit で記録として確定する
- C. add と commit はどちらを打っても同じ意味

<details>
<summary>答え</summary>

**B** — add が「選ぶ」、commit が「確定する」です。順番も役割も入れ替えられません。

</details>

### Q2. Untracked の practice.txt を次の記録に入れるものとして選ぶコマンドはどれですか。

- A. git add practice.txt
- B. git status practice.txt
- C. git init practice.txt

<details>
<summary>答え</summary>

**A** — git add ファイル名 で次の記録に入れるファイルを選びます。status は状態確認、init はリポジトリを作るコマンドです。

</details>

### Q3. ステージングエリアの説明として正しいものはどれですか。

- A. 確定した記録が永久に保存される場所
- B. 削除されたファイルの一時的なごみ箱
- C. add で選んだ変更が commit を待つ「次のコミットの下書き」置き場

<details>
<summary>答え</summary>

**C** — ステージングエリアは下書き置き場です。確定した記録の置き場(履歴)とは区別します。

</details>

### Q4. git add . の使い方として最も適切なものはどれですか。

- A. 何も確認せずに打ってよい(全部載るので安全)
- B. 打つ前に git status で変更の中身を確かめてから使う
- C. ファイルが1つのときしか使えない

<details>
<summary>答え</summary>

**B** — add . は変更を全部載せるので、載せるつもりのないものが紛れ込みやすいです。前後を status で挟む型で使います。

</details>

### Q5. git add memo.txt の後に memo.txt を編集して保存しました。この状態の説明として正しいものはどれですか。

- A. 編集した分も自動でステージングエリアに載っている
- B. 編集した分は載っていないので、もう一度 git add memo.txt を打つ
- C. add の後に編集するとエラーになり、保存できない

<details>
<summary>答え</summary>

**B** — add はその瞬間の内容を載せる操作です。後から編集した分は載っていないので、記録に入れたければもう一度 add します。

</details>
