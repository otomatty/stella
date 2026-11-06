# レッスン5-1 演習 — テストしやすいコードの書き方

対象トピック: 5-1-1 〜 5-1-4

## 手元で試す

隠れた依存を持つ関数を書いて、テストできないことを体験します。

```python
# campaign.py
import datetime


def is_campaign_period():
    today = datetime.date.today()
    return today.month == 12
```

```python
# test_campaign.py
from campaign import is_campaign_period


def test_december_is_campaign():
    assert is_campaign_period() is True
```

```bash
pytest
```

12月以外に実行すると失敗します。**コードは正しいのにテストが赤くなる** 状態です。

次に、依存を引数で渡す形へ書き換えます。

```python
# campaign.py
import datetime


def is_campaign_period(today=None):
    today = today or datetime.date.today()
    return today.month == 12
```

```python
# test_campaign.py
import datetime

from campaign import is_campaign_period


def test_december_is_campaign():
    assert is_campaign_period(datetime.date(2026, 12, 1)) is True


def test_november_is_not_campaign():
    assert is_campaign_period(datetime.date(2026, 11, 30)) is False
```

いつ実行しても2件とも緑になります。確かめられたら、次の改造もしてみましょう。

1. 「11月と12月がキャンペーン期間」に仕様を変え、境界値(10月31日 / 11月1日 / 12月31日 / 1月1日)のテストを parametrize で足す
2. 本番のコードが `is_campaign_period()` と引数なしで呼べることを確かめる
3. 乱数を使う関数を1つ書き、同じやり方で引数に追い出してみる

## 演習問題

### 問1(基本)

次の関数の隠れた依存を挙げてください。

```python
import random

TAX_RATE = 0.1


def calc_lucky_price(price):
    if random.random() < 0.1:
        return 0
    return int(price * (1 + TAX_RATE))
```

### 問2(基本)

次の関数を、依存性の注入を使ってテストできる形に書き換えてください。

```python
import datetime


def make_receipt_id():
    return f"R-{datetime.date.today():%Y%m%d}"
```

### 問3(応用)

次の関数は純粋関数ですか。理由も書いてください。

```python
def add_tax(order):
    order["total"] = int(order["total"] * 1.1)
    return order["total"]
```

### 問4(応用)

次の関数から純粋関数を切り出し、I/O を担当する関数と分けてください。

```python
def report(path):
    prices = read_csv(path)
    total = sum(prices)
    average = total / len(prices)
    save_to_db({"total": total, "average": average})
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

2つあります。1つは `random.random()`(乱数)で、同じ引数でも結果が変わります。もう1つはグローバル変数の `TAX_RATE` で、外の値に依存しています。

</details>

<details>
<summary>問2の解答例</summary>

```python
def make_receipt_id(today=None):
    today = today or datetime.date.today()
    return f"R-{today:%Y%m%d}"


def test_make_receipt_id():
    assert make_receipt_id(datetime.date(2026, 8, 18)) == "R-20260818"
```

既定値を使えば、本番の呼び出し側を直さずに済みます。

</details>

<details>
<summary>問3の解答例</summary>

純粋関数ではありません。戻り値を返すだけでなく、引数として渡された辞書を書き換えています(副作用)。呼び出し側の値まで変わるため、テストのたびに元の状態を作り直す必要があります。`return int(order["total"] * 1.1)` として書き換えをやめれば純粋関数になります。

</details>

<details>
<summary>問4の解答例</summary>

```python
def summarize(prices):          # 純粋関数
    total = sum(prices)
    return {"total": total, "average": total / len(prices)}


def report(path):               # I/O を担当
    save_to_db(summarize(read_csv(path)))
```

`summarize` は単体テストで何通りでも確かめられます。空リストのときの扱い(ゼロ除算)も、単体テストで詰められます。

</details>

## 確認クイズ

### Q1. 隠れた依存の説明として正しいものはどれですか。

- A. 引数に現れないのに、結果を左右する依存先
- B. import が多すぎる状態
- C. 関数の行数が長すぎる状態

<details>
<summary>答え</summary>

**A** — 現在時刻・乱数・グローバル変数・外部 I/O が代表例です。

</details>

### Q2. 隠れた依存があることを見分ける基準はどれですか。

- A. 引数が同じでも結果が変わることがある
- B. 関数名が長い
- C. 戻り値が辞書である

<details>
<summary>答え</summary>

**A** — この1つの基準で、ほとんどの隠れた依存が見つかります。

</details>

### Q3. 依存性の注入とは何ですか。

- A. 依存先を引数で外から渡す形にすること
- B. テスト用の分岐を本番コードに入れること
- C. テスト実行時にシステムの日付を変えること

<details>
<summary>答え</summary>

**A** — 引数を1つ増やすだけです。B と C は、テストのために本番の動きを歪めるやり方です。

</details>

### Q4. 純粋関数の説明として正しいものはどれですか。

- A. 同じ入力なら必ず同じ出力を返し、外の状態を変えない
- B. 引数を1つしか取らない
- C. 戻り値を持たない

<details>
<summary>答え</summary>

**A** — 準備も後片付けも要らないので、最も安くテストできます。

</details>

### Q5. ロジックと I/O を分けると、何が良くなりますか。

- A. 計算部分が純粋関数になり、単体テストで守れる範囲が広がる
- B. 実行速度が必ず2倍になる
- C. 結合テストが不要になる

<details>
<summary>答え</summary>

**A** — つなぎ目の確認は結合テストで必要です。単体で守れる範囲が広がるのが利点です。

</details>
