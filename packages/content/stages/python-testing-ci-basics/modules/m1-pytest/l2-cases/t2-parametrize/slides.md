---
id: 1-2-2
title: parametrize で入力データを並べる
takeaway: "parametrizeを使うと、同じ検証を複数の入力データで繰り返せる"
introduces: [parametrize, テストケース]
requires: [テスト関数, assert, 境界値]
header: "Pythonテスト自動化とCI入門"
---

<!-- _class: lead -->

# 1-2-2
# parametrize で入力データを並べる

Pythonテスト自動化とCI入門 — Module 1 / レッスン1-2

<!-- ノート: 観点を増やすと、同じ形のテストが並びます。その重複を畳む書き方です。 -->

---

## なぜ必要か

- 入力だけ違うテストを、コピーして貼って書き換えている
- 検証の書き方を直したいのに、5か所を同じように直す羽目になる

<!-- ノート: つかみ。コピーしたテストは、1つだけ直し忘れる。ここで結論は言わない。 -->

---

## 結論

**parametrizeを使うと、同じ検証を複数の入力データで繰り返せる**

- 入力と期待値の組が **テストケース**
- **parametrize** はケースを並べる pytest の機能

<!-- ノート: 結論を言い切る。テストの本数は減らない。書く量だけが減る。 -->

---

## 最小のコード

```python
import pytest


@pytest.mark.parametrize("prices, expected", [
    ([100, 200], 300),
    ([], 0),
    ([500], 500),
])
def test_calc_total(prices, expected):
    assert calc_total(prices) == expected
```

<!-- ノート: 1行1ケース。ケースを増やす作業が、行を1本足すだけになる。 -->

---

## 実行結果の見え方

```text
test_order.py::test_calc_total[prices0-300] PASSED
test_order.py::test_calc_total[prices1-0]   PASSED
test_order.py::test_calc_total[prices2-500] PASSED
```

- 3件のテストとして数えられる
- 失敗したケースだけが名前で分かる

<!-- ノート: 対比枠。まとめて1本になるのではない、が肝。どのケースが落ちたか個別に分かる。 -->

---

<!-- _class: summary -->

## まとめ

**parametrizeを使うと、同じ検証を複数の入力データで繰り返せる**

<!-- ノート: 結論の再掲だけ。今度は入力ではなく、準備そのものが重複してくる、と引いて締める。 -->
