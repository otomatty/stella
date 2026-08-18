# レッスン1-2 演習 — テストケースを充実させる

対象トピック: 1-2-1 〜 1-2-3

## 手元で試す

レッスン1-1 の `order.py` に、割引を計算する関数を足します。

```python
# order.py に追記
def apply_discount(total, rate):
    """rate は 0.0〜1.0 の割引率。割引後の金額を整数で返す。"""
    return int(total * (1 - rate))
```

`test_order.py` を次の内容にして実行してください。

```python
import pytest

from order import apply_discount, calc_total


@pytest.mark.parametrize("prices, expected", [
    ([100, 200], 300),
    ([], 0),
    ([500], 500),
])
def test_calc_total(prices, expected):
    assert calc_total(prices) == expected


@pytest.fixture
def sample_total():
    return 1000


def test_apply_discount(sample_total):
    assert apply_discount(sample_total, 0.2) == 800
```

```bash
pytest -v
```

`-v` を付けると、テストが1件ずつ名前付きで表示されます。parametrize の3ケースが3件として数えられていることを確かめてください。

確かめられたら、次の改造をしてみましょう。

1. parametrize のケースに `([100, -50], 50)` を足して、負の金額でも合計できることを確かめる
2. `apply_discount` の割引率 `0.0`(境界値)と `1.0`(境界値)のケースを足す
3. `sample_total` fixture を `yield` を使う形に書き換え、`yield` の後ろに `print("後片付け")` を置いて、`pytest -s` で実行されることを確かめる

## 演習問題

### 問1(基本)

次の関数について、正常系・境界値・異常系のテスト観点を1つずつ挙げてください。

```python
def calc_shipping(total):
    """合計金額が5000円以上なら送料0円、未満なら500円。"""
    if total >= 5000:
        return 0
    return 500
```

### 問2(基本)

問1の `calc_shipping` について、`4999` と `5000` の2つを確かめるテストを parametrize で書いてください。

### 問3(応用)

parametrize でまとめるべきではないのは、どんなケースですか。1〜2文で説明してください。

### 問4(応用)

次の2つのテストは、単独で実行すると通りますが、続けて実行すると2つ目が失敗します。原因と、fixture を使った直し方を説明してください。

```python
orders = []


def test_add_one_order():
    orders.append({"total": 300})
    assert len(orders) == 1


def test_add_another_order():
    orders.append({"total": 500})
    assert len(orders) == 1
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

- 正常系: `10000` を渡すと `0` が返る
- 境界値: `5000` ちょうどを渡すと `0` が返る(`4999` なら `500`)
- 異常系: 負の数を渡したときにどうなるか

境界値は「条件の切り替わり目とその1つ外」を必ず両方確かめます。

</details>

<details>
<summary>問2の解答例</summary>

```python
@pytest.mark.parametrize("total, expected", [
    (4999, 500),
    (5000, 0),
])
def test_calc_shipping(total, expected):
    assert calc_shipping(total) == expected
```

</details>

<details>
<summary>問3の解答例</summary>

検証している振る舞いが違うケースです。入力を差し替えれば同じ `assert` で確かめられるものだけをまとめます。分岐や期待する結果の種類が違うなら、別のテスト関数に分けてください。

</details>

<details>
<summary>問4の解答例</summary>

`orders` をテストの外に置いているため、1つ目のテストで追加した要素が残り、2つ目の `len(orders)` が `2` になります。実行順で結果が変わる状態です。

fixture で毎回新しいリストを作れば直ります。

```python
@pytest.fixture
def orders():
    return []


def test_add_one_order(orders):
    orders.append({"total": 300})
    assert len(orders) == 1
```

</details>

## 確認クイズ

### Q1. 境界値の例として適切なものはどれですか。

- A. 空のリストや、条件の切り替わり目のちょうどの値
- B. 実務でいちばん多い、平均的な入力
- C. 実行にいちばん時間がかかる入力

<details>
<summary>答え</summary>

**A** — 0件、上限、条件の切り替わり目とその1つ外が境界値です。バグは端に住んでいます。

</details>

### Q2. parametrize を使うと、テストの本数はどうなりますか。

- A. ケースの数だけテストとして数えられる
- B. まとめて1件のテストになる
- C. 最初のケースだけが実行される

<details>
<summary>答え</summary>

**A** — 減るのは書く量だけです。どのケースが失敗したかは個別に分かります。

</details>

### Q3. fixture の戻り値をテストで使うには、どう書きますか。

- A. テスト関数の引数に fixture の名前を書く
- B. テストの中で fixture を関数として呼び出す
- C. ファイルの先頭で import する

<details>
<summary>答え</summary>

**A** — 引数名で結びつきます。呼び出しコードは書きません。

</details>

### Q4. fixture の `yield` より後ろに書いた処理は、いつ実行されますか。

- A. テストが終わったあと(失敗しても実行される)
- B. テストが成功したときだけ
- C. すべてのテストが終わった最後に1回だけ

<details>
<summary>答え</summary>

**A** — 後片付けです。失敗しても実行されるので、次のテストが汚れません。

</details>

### Q5. 実行順によって結果が変わるテストの原因として、最もありがちなものはどれですか。

- A. テストの外に置いた状態が、前のテストの影響を残している
- B. テスト関数の名前が長すぎる
- C. parametrize のケースが多すぎる

<details>
<summary>答え</summary>

**A** — 共有した状態や消し忘れた一時ファイルが原因です。fixture で毎回きれいな状態から始めてください。

</details>
