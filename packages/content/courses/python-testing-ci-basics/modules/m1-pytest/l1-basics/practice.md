# レッスン1-1 演習 — pytest の基本

対象トピック: 1-1-1 〜 1-1-4

## 手元で試す

レッスン0-1 で作ったフォルダに、次の2つのファイルを置いてください。

```python
# order.py
def calc_total(prices):
    total = 0
    for price in prices:
        total += price
    return total
```

```python
# test_order.py
from order import calc_total


def test_returns_sum_of_prices():
    prices = [100, 200]
    total = calc_total(prices)
    assert total == 300
```

ターミナルで実行します。

```bash
pytest
```

`1 passed` と表示されれば成功です。確かめられたら、次の改造をしてみましょう。

1. 期待値を `301` に書き換えて実行し、失敗の出力に実際の値と期待値が両方出ることを確かめる(確かめたら戻す)
2. テスト関数の名前を `check_returns_sum_of_prices` に変えて実行し、`no tests ran` になることを確かめる(確かめたら戻す)
3. `calc_total([])` が `0` になることを確かめるテストを、2本目として追加する

## 演習問題

### 問1(基本)

次のファイルを `pytest` で実行しても、テストが1つも実行されませんでした。理由を答えてください。

```python
# orders.py
def test_calc_total():
    assert calc_total([100, 200]) == 300
```

### 問2(基本)

次のテストを AAA(準備・実行・検証)の3段に書き直してください。

```python
def test_calc_total():
    assert calc_total([1000, 2000, 3000]) == 6000
```

### 問3(応用)

次のテストは、実行すると `assert calc_total([100, 200]) == 300` の行で失敗しました。このとき、その下の2つの `assert` について何が言えますか。

```python
def test_calc_total():
    assert calc_total([100, 200]) == 300
    assert calc_total([]) == 0
    assert calc_total([500]) == 500
```

### 問4(応用)

問3のテストを、1テスト1振る舞いになるように書き直してください。関数名も適切に付けてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

ファイル名が名前の決まりから外れているためです。pytest が集めるのは、既定では `test_` で始まるか `_test.py` で終わるファイルだけです。`orders.py` はどちらにも当てはまりません。`test_orders.py` に変えれば実行されます。

</details>

<details>
<summary>問2の解答例</summary>

```python
def test_calc_total():
    prices = [1000, 2000, 3000]  # 準備
    total = calc_total(prices)   # 実行
    assert total == 6000         # 検証
```

</details>

<details>
<summary>問3の解答例</summary>

その2つは実行されていません。`assert` は最初に失敗した時点でテストを終了するためです。「残りは通った」とは言えません。

</details>

<details>
<summary>問4の解答例</summary>

```python
def test_returns_sum_of_prices():
    assert calc_total([100, 200]) == 300


def test_returns_zero_for_empty_list():
    assert calc_total([]) == 0


def test_returns_the_price_itself_for_one_item():
    assert calc_total([500]) == 500
```

分けておくと、失敗したテストの名前だけで、どの振る舞いが壊れたのか分かります。

</details>

## 確認クイズ

### Q1. pytest がテストとして集めるのはどれですか。

- A. `test_order.py` の中の `test_calc_total`
- B. `orders.py` の中の `test_calc_total`
- C. `test_order.py` の中の `check_calc_total`

<details>
<summary>答え</summary>

**A** — ファイル名と関数名の両方が名前の決まりを満たす必要があります。B はファイル名が `test_` で始まらず `_test.py` でも終わらないため集められません。C は関数名が `test_` で始まっていません。

</details>

### Q2. テストが1つも実行されず「0 個」と表示されました。最初に疑うべきことはどれですか。

- A. ファイル名や関数名が `test_` で始まっているか
- B. パソコンの空き容量が足りているか
- C. 期待値の計算が間違っていないか

<details>
<summary>答え</summary>

**A** — `no tests ran` は「テストが失敗した」ではなく「1つも集まっていない」という意味です。赤い `assert` の行が出ないので見落としやすくなります。まず名前を疑ってください。

</details>

### Q3. `assert` が真だったとき、その `assert` について pytest は何を表示しますか。

- A. 何も表示しない
- B. 実際の値と期待値を並べて表示する
- C. 警告を表示する

<details>
<summary>答え</summary>

**A** — 値が並ぶのは失敗したときだけです。テスト全体としては `1 passed` のような集計は表示されますが、通った `assert` の中身は出ません。

</details>

### Q4. AAA は何の頭文字ですか。

- A. 準備・実行・検証
- B. 追加・変更・削除
- C. 単体・結合・E2E

<details>
<summary>答え</summary>

**A** — Arrange(準備)・Act(実行)・Assert(検証)の3段です。

</details>

### Q5. 1つのテスト関数に検証を詰め込むと起きる問題はどれですか。

- A. 途中で失敗すると、その先の検証が実行されない
- B. pytest がテストとして集めてくれなくなる
- C. 期待値を書けなくなる

<details>
<summary>答え</summary>

**A** — 最初の失敗でテストは終了します。残りが通ったかどうかは分かりません。

</details>
