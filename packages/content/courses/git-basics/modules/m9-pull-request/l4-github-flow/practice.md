# レッスン9-4 演習 — GitHub Flow

対象トピック: 9-4-1 〜 9-4-3

## ハンズオン

手元の VS Code のターミナルと GitHub の画面で試します。練習用リポジトリ(`~/git-practice-remote`)で、Issue から始めて PR のマージで終わる GitHub Flow の1周を通します。

1. GitHub のリポジトリで「Issues」タブ →「New issue」を押します。タイトルに「practice.txt に学習の振り返りを追加したい」、本文に理由(例: 研修の記録を残すため)を書いて「Submit new issue」で作成します。付いた番号(例: `#1`)を覚えておきます
2. ターミナルで、最新の main からブランチを出します

   ```bash
   cd ~/git-practice-remote
   git switch main
   git pull
   git switch -c add-retrospective
   ```

3. `practice.txt` に振り返りを1行(例: `振り返り: PRを1人で1周回せるようになった`)追記して保存します
4. コミットして push します

   ```bash
   git add practice.txt
   git commit -m "学習の振り返りを追記"
   git push -u origin add-retrospective
   ```

5. GitHub で PR を開きます。説明欄に「何を・なぜ」と、最後に `Closes #1`(手順1の番号)を書いて作成します。説明欄の下に Issue へのリンクが表示されることを確認します
6. 「Merge pull request」→「Confirm merge」でマージし、「Delete branch」でリモートの枝を消します。1人のリポジトリなので Approve なしでマージできます
7. Issues タブを開き、手順1の Issue が自動で Closed になっていることを確認します
8. 手元を片付けて、1周を締めます

   ```bash
   git switch main
   git pull
   git branch -d add-retrospective
   ```

Issue に始まり、ブランチ → PR → マージ → 片付けで終わる。この1周が GitHub Flow です。

## 演習問題

### 問1(基本)

GitHub Flow の1周を、「main」「ブランチ」「PR」の3語を全部使って2文以内で説明してください。

### 問2(基本)

「1行だけの誤字修正だから、main に直接 push してもよい」という意見の問題点を、main の役割に触れて指摘してください。

### 問3(応用)

「会員一覧の検索が遅い」という報告を受けて改善作業を始めます。Issue と PR にそれぞれ何を残すべきか、役割分担を説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

最新の main からブランチを出して作業し、PR を開いてレビューを経て main へ戻します。マージしたらブランチを片付け、また main から次のブランチを出す、の繰り返しです。

「main から枝を出し、PR で戻す」の繰り返し、という1文が核になっていれば正解です。

</details>

<details>
<summary>問2の解答例</summary>

main は全員の作業の出発点なので、誤りが入ると main から枝を切る全員に被害が広がることです。

1行でもブランチ + PR を経由すれば、取り込む前に人の目が入り、記録も残ります。小さい修正ほど油断が出るので、例外を作らないのが原則です。

</details>

<details>
<summary>問3の解答例</summary>

Issue には作業の理由(検索が遅いという報告・困りごと)を残します。PR には理由に対する変更(改善したブランチの取り込み依頼)を残し、説明欄に「Closes #番号」と書いて Issue と紐づけます。

こうすると理由と変更がリンクでつながり、マージ時に Issue も自動で閉じます。

</details>

## 確認クイズ

### Q1. GitHub Flow の説明として正しいものはどれですか。

- A. main から枝を出し、PR で戻すことの繰り返し
- B. 全員が main に直接 push して、衝突したら相談する型
- C. 月に1回だけ、全部の変更をまとめてマージする型

<details>
<summary>答え</summary>

**A** — GitHub Flow は「main から枝を出し、PR で戻す」の繰り返しです。この研修で学んだ1周の流れに付いた名前で、多くのチームが採用しています。

</details>

### Q2. 「main へ直接 push しない」という約束の理由として最も適切なものはどれですか。

- A. main への push は GitHub の有料機能だから
- B. main は全員の出発点なので、レビューを通った変更だけを入れて動く状態に保つため
- C. 直接 push すると履歴がすべて消えてしまうから

<details>
<summary>答え</summary>

**B** — main は全員がそこから枝を切る出発点です。壊れた main は全員に波及するので、どんな小さな変更もブランチ + PR を経由させます。

</details>

### Q3. Issue と PR の役割分担として正しいものはどれですか。

- A. Issue に変更の差分を貼り、PR に困りごとを書く
- B. Issue に作業の理由を残し、PR の説明で「Closes #番号」と書いて紐づける
- C. Issue と PR は同じ機能の別名なので、どちらか一方だけ使う

<details>
<summary>答え</summary>

**B** — 理由は Issue、変更は PR に置き、Closes #番号で紐づけます。マージすると Issue が自動で閉じるところまでがこの型の利点です。

</details>
