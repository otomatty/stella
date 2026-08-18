---
id: 1-2-3
title: fixture で準備と後片付けを共通化する
takeaway: "fixtureを使うと、テストごとの準備・後片付けを共通化できる"
introduces: [fixture, 前処理, 後片付け]
requires: [pytest, テスト関数, AAA]
header: "Pythonテスト自動化とCI入門"
---

<!-- _class: lead -->

# 1-2-3
# fixture で準備と後片付けを共通化する

Pythonテスト自動化とCI入門 — Module 1 / レッスン1-2

<!-- ノート: AAA の「準備」が長くなってきたときの受け皿です。 -->

---

## なぜ必要か

- どのテストも、同じ準備コードを10行コピーしている
- 作った一時ファイルを消し忘れ、次のテストが前回の結果に影響される

<!-- ノート: つかみ。テストが「実行順」で結果を変える状態は、最も直しにくい。ここで結論は言わない。 -->

---

## 結論

**fixtureを使うと、テストごとの準備・後片付けを共通化できる**

- テストの前に走るのが **前処理**、後に走るのが **後片付け**
- **fixture** は、その両方をまとめて1か所に書く仕組み

<!-- ノート: 結論を言い切る。共通化が目的ではなく、毎回きれいな状態から始めるのが目的。 -->

---

## 最小のコード

```python
import pytest


@pytest.fixture
def sample_prices():
    return [100, 200, 400]


def test_calc_total(sample_prices):
    assert calc_total(sample_prices) == 700
```

- 引数名に fixture の名前を書くと、戻り値が渡される

<!-- ノート: 引数で受け取る形が独特。名前で結びつくことを指しながら説明する。 -->

---

## 後片付けまで書く

```python
@pytest.fixture
def temp_file(tmp_path):
    path = tmp_path / "orders.csv"
    path.write_text("100,200")
    yield path        # ここまでが前処理
    path.unlink()     # yield の後が後片付け
```

- `yield` の前後で、前処理と後片付けが分かれる

<!-- ノート: 対比枠。テストが失敗しても後片付けは実行される。だから次のテストが汚れない。 -->

---

<!-- _class: summary -->

## まとめ

**fixtureを使うと、テストごとの準備・後片付けを共通化できる**

<!-- ノート: 結論の再掲だけ。書けるようになったので、次は失敗したときの読み方へ進む、と引いて締める。 -->
