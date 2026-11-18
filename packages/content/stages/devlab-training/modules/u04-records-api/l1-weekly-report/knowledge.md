---
sourceRefs: [SRC-hono-routing-20261118, SRC-hono-context-20261118, SRC-hono-testing-20261118]
---
## 知識問題

### Q1. 記録を確定するルートには、どのメソッドとパスを使いますか？
<!-- kind: single; skills: devlab-training-records-api -->

- A. `GET /weeks/:week/records`
- B. `GET /records/:id/confirm`
- C. `POST /records/:id/confirm`

<details>
<summary>解答</summary>

**C** — この操作は ID で選んだ記録の状態を変えるので、確定用のパスに POST します。

</details>

### Q2. `2026-W1` を指定した一覧リクエストには、何を返しますか？
<!-- kind: single; skills: devlab-training-records-api -->

- A. 200 と空の一覧
- B. 400 と理由を伝える JSON
- C. 404 と理由を伝える JSON

<details>
<summary>解答</summary>

**B** — 週番号が2桁という入力の決まりに合わないので、400 とエラーの理由を返します。

</details>

### Q3. 確定が次の一覧に反映されたことは、どう確かめますか？
<!-- kind: single; skills: devlab-training-records-api -->

- A. 同じアプリに `app.request()` で確定の POST と一覧の GET を送り、一覧の JSON を読む
- B. POST の応答が 200 なら一覧も更新されたと判断する
- C. 確定のあと新しいアプリを作り、その一覧の JSON を読む

<details>
<summary>解答</summary>

**A** — 同じアプリに一覧を求めると、確定した状態が残っているか確かめられます。

</details>
