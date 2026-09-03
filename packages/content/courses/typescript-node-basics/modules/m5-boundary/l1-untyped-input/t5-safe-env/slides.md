---
id: 5-1-5
title: 環境変数は関数を通して読む
takeaway: "環境変数は読み取り用の関数を1つ作り、無いときの扱いをそこにまとめる"
introduces: [設定]
requires: [境界, undefined, 戻り値, 引数, unknown]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 5-1-5
# 環境変数は関数を通して読む

TypeScript 入門（サーバー） — Module 5 / レッスン5-1

<!-- ノート: 講座の最後のトピックです。学んだ型と境界の考え方を、1つの実例に落とします。 -->

---

## なぜ必要か

- `process.env.PORT` を使うたびに、`undefined` の確認を書いている
- 確認の書き方が場所によって違い、抜けているところもある

<!-- ノート: つかみ。前トピックの「散らばった確認」の具体例です。 -->

---

## 結論

**環境変数は読み取り用の関数を1つ作り、無いときの扱いをそこにまとめる**

- **設定** — 環境ごとに変わる値。接続先やポート番号など

<!-- ノート: 結論を先に言い切ります。境界を関数にすると、型も確認も 1 か所に集まります。 -->

---

## 読み取りを1か所に集める

```ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error("環境変数 " + name + " が未設定です");
  }
  return value;                       // ここから先は string
}

const apiUrl: string = requireEnv("API_URL");
```

<!-- ノート: 戻り値が string なので、呼び出し側は確認不要です。境界の効果が一目で分かります。 -->

---

<!-- _class: summary -->

## まとめ

**環境変数は読み取り用の関数を1つ作り、無いときの扱いをそこにまとめる**

<!-- ノート: 結論の再掲だけ。講座はここまでです。次は REST API 入門へ続きます。 -->
