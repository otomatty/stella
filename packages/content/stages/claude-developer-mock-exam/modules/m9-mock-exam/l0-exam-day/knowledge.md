---
title: 試験の準備と条件の読み取り
sourceRefs: [SRC-claude-four-certs-20261031, SRC-claude-docs-batch-20261031, SRC-claude-developer-guide-v11-20261118]
---
## 知識問題

### Q1. 本番で、どの選択肢も動く作り方に見えました。選び方として適切なものはどれですか？
<!-- kind: single; skills: claude-cert-exam-plan -->

- A. 問題文から場面の条件を拾い、条件に合わない選択肢から外して比べる
- B. いちばん新しい機能の名前が入った選択肢を選ぶ
- C. いちばん長い選択肢を選ぶ

<details>
<summary>解答</summary>

**A** — 試験は実際の仕事を映すように作られているので、場面の条件にいちばん合うものが正解です。

</details>

### Q2. 5 万件の短い問い合わせ履歴を分類します。全体は 100 MB、依頼者は画面を閉じています。翌日以降に集計でき、期限までに完了しなかった分は後で再処理できます。費用を抑える案はどれですか？
<!-- kind: single; skills: claude-cert-exam-plan, claude-batches -->

- A. 各件をストリーミングで送り、先頭の文字が返ったら次の件を始める
- B. Message Batches API に送り、結果を照合して未完了の件を拾う
- C. 同期で 1 件ずつ送り、5 万件すべて返ってからまとめて集計する

<details>
<summary>解答</summary>

**B** — この件数と容量なら 1 バッチに収まり、費用の割引を使えます。バッチは最長 24 時間の処理枠で、期限切れになる件もあります。未完了分を拾えることが条件です。画面で誰も待っていないため、途中表示は役立ちません。

</details>

### Q3. 申し込みの前に確かめることとして、適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-cert-exam-plan -->

- A. 所属する組織が Claude Partner Network に加盟し、自分が登録されているか
- B. Developer 試験ガイド v1.1 の 8 分野に照らして、復習が必要な分野を確認したか
- C. 第三者の問題集に、本番の問題が載っているか
- D. 当日の本人確認に要るものを、申し込みの案内で確かめたか

<details>
<summary>解答</summary>

**A, B, D** — 本番の問題を写したとされる問題集は、学習に使いません。

</details>

### Q4. 試験は監督つきで行われ、始める前に本人確認があります。
<!-- kind: boolean; skills: claude-cert-exam-plan -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 試験は Pearson が監督つきで行い、受ける人は始める前に本人確認をします。合格すると Credly のデジタルバッジが届きます。

</details>
