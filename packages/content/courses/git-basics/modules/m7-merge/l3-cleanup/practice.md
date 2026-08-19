# レッスン7-3 演習 — ブランチの後始末

対象トピック: 7-3-1 〜 7-3-3

## ハンズオン

手元の VS Code のターミナルで、`~/git-practice` に残っているブランチを片付けます。前のレッスンまでで作った add-schedule / add-price / fix-greeting が残っている想定です(無ければ読み替えて進めてください)。

### 1. マージ済みのブランチを消す

1. 今あるブランチを一覧します。

   ```bash
   cd ~/git-practice
   git branch
   #   add-price
   #   add-schedule
   #   fix-greeting
   # * main
   ```

2. マージし終えた枝を -d で消します。

   ```bash
   git branch -d add-schedule
   git branch -d add-price
   git branch -d fix-greeting
   # それぞれ Deleted branch ... (was ...). と表示される
   ```

3. コミットが消えていないことを確かめます。

   ```bash
   git log --graph --oneline
   ```

   付箋(ブランチ名)は消えても、積んだコミットと合流の形はそのまま残っています。

### 2. 未マージのブランチで安全装置を確かめる

1. 実験用のブランチを作り、コミットを1つ積みます。

   ```bash
   git switch -c try-design
   ```

   VS Code で `memo.txt` の末尾に `デザイン案: 見出しを大きくする` の1行を追記して保存し、コミットします。

   ```bash
   git add memo.txt
   git commit -m "デザイン案を追記"
   ```

2. main へ戻って、-d で消そうとしてみます。

   ```bash
   git switch main
   git branch -d try-design
   # error: the branch 'try-design' is not fully merged
   ```

   断られました。まだマージしていないコミットがあるからです。

3. 中身を確かめてから判断します。今回はただの実験なので、捨ててよいと確認できたら -D で強制削除します。

   ```bash
   git log try-design --oneline    # 何が積まれているか見る
   git branch -D try-design
   # Deleted branch try-design (was ...).
   ```

4. `git branch` で main だけが残ったことを確かめます。「作る → 積む → 合流 → 消す」の1周を、自分の手で回せるようになりました。

## 演習問題

### 問1(基本)

マージし終えたブランチ `fix-header` を消すコマンドを書いてください。また、このとき消えるものと残るものをそれぞれ答えてください。

### 問2(基本)

`git branch -d try-layout` が `not fully merged` と断ってきました。この表示の意味と、次にすべきことを説明してください。

### 問3(応用)

「ブランチの一生」の4つの段階を順番に挙げ、それぞれで使う代表的なコマンドを1つずつ書いてください(「積む」はコミットの操作で構いません)。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
git branch -d fix-header
```

消えるのはブランチという名前(付箋)だけです。積んだコミットは履歴に残り、マージ済みなのでその変更は受け皿の枝にも入っています。

</details>

<details>
<summary>問2の解答例</summary>

「この枝には、まだ合流していないコミットが残っている」という警告です。安全装置が働いただけで、失敗ではありません。

次にすべきことは中身の確認です。git log try-layout --oneline などで何が積まれているかを見て、必要ならマージしてから -d で消します。本当に捨ててよいと確かめられたときだけ -D を使います。

</details>

<details>
<summary>問3の解答例</summary>

1. 作る: git switch -c 枝名
2. 積む: git commit -m "メッセージ"(編集と add を繰り返す)
3. 合流: git switch main してから git merge 枝名
4. 消す: git branch -d 枝名

この1周を短く回すのがブランチ運用の基本です。

</details>

## 確認クイズ

### Q1. git branch -d でマージ済みのブランチを消したとき、正しい説明はどれですか。

- A. そのブランチに積んだコミットも一緒に消える
- B. 消えるのはブランチ名(付箋)だけで、コミットは履歴に残る
- C. main も一緒に消えてしまう

<details>
<summary>答え</summary>

**B** — ブランチは動く付箋です。付箋をはがしても、貼ってあったコミットは消えません。

</details>

### Q2. git branch -d が「not fully merged」と断ってきました。まずすべきことはどれですか。

- A. すぐに git branch -D で強制削除する
- B. log などでその枝の中身を確かめ、必要ならマージしてから消す
- C. リポジトリを作り直す

<details>
<summary>答え</summary>

**B** — 断られたのは安全装置の合図です。中身を確かめ、必要な変更ならマージしてから -d で消します。-D は捨ててよいと確かめてからだけです。

</details>

### Q3. -d と -D の違いとして正しいものはどれですか。

- A. -d は未マージの枝を断り、-D は未マージでも強制的に消す
- B. -d はコミットごと消し、-D は付箋だけを消す
- C. どちらも同じ動きで、書き方の好みの問題

<details>
<summary>答え</summary>

**A** — 小文字の -d には安全装置があり、未マージなら断ります。大文字の -D はそれを外して強制削除します。

</details>

### Q4. 「ブランチの一生」の正しい順番はどれですか。

- A. 作る → 積む → 合流 → 消す
- B. 作る → 合流 → 積む → 消す
- C. 積む → 作る → 消す → 合流

<details>
<summary>答え</summary>

**A** — 枝を作り、コミットを積み、取り込む側へ移って合流させ、マージ済みの枝を消す。この1周を短く回すのが基本です。

</details>
