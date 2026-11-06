# 配点に合わせて学習時間を配る

試験までに使える時間を、試験ガイドの範囲ごとの配点に合わせて配ります。`src/study-plan.js` の `allocateStudyHours` を完成させてください。

## 作るもの

`allocateStudyHours(totalHours, domains)` は、学習に使える時間の合計と、範囲の名前・配点の配列を受け取ります。範囲ごとの時間を、同じ順の配列で返します。

- 各範囲の時間は「合計の時間 × その範囲の配点 ÷ 配点の合計」です。配点の合計が 100 でなくても、合計に対する割合で配ります。
- 時間は 0.5 時間単位に丸めます(例: 2.33 時間は 2.5 時間)。
- 範囲の順と名前は変えません。

```js
allocateStudyHours(10, [
  { name: "API", weight: 50 },
  { name: "モデル", weight: 30 },
  { name: "ツール", weight: 20 },
]);
// => [{ name: "API", hours: 5 }, { name: "モデル", hours: 3 }, { name: "ツール", hours: 2 }]
```

例の範囲と配点は、課題のための値です。自分の学習計画には、Partner Academy の試験ガイドで確かめた範囲と配点を使います。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。初回は道具の準備(`npm ci`)に少し時間がかかります。テストと設定のファイルは書き換えません。
