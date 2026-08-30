# テスト設計と品質保証 入門(test-design-basics)実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新講座 `test-design-basics`(6 モジュール / 21 レッスン / 82 トピック)を `packages/content/courses/` に実装し、ローカル LMS で全レッスンが「スライド → まとめ → 確認クイズ」で完走できる状態にする。

**Architecture:** 教材はファイルが正本(`courses/<slug>/`)。トピック = `slides.md`(4〜6枚)、レッスン = `doc.md` + `practice.md`、`practice.md` の確認クイズだけが LMS の quiz になる。seed(`bun run db:seed`)で D1 に入る。コード演習の自動採点は配線しない(`course.json` に `exercises` を書かない)。

**Tech Stack:** Markdown 教材 + `@falcon/content` のビルド検査(`check:ci`)/ manifest(`bun run test`)/ D1 seed。ハンズオンのコード例は Python + pytest(受講者の手元実行、採点なし)。

**正本ドキュメント(各タスクの実装者は必ず先に読む):**
- 全 82 トピックの ID・タイトル・takeaway: `docs/superpowers/specs/2026-08-20-test-design-basics-curriculum.md`(Task 1 で `packages/content/courses/test-design-basics/CURRICULUM.md` へ移動。以後はそちらが正本)
- 書き方: `packages/content/STYLE_GUIDE.md` と `packages/content/CLAUDE.md`
- 手順: `packages/content/ADDING_COURSE.md`
- 設計判断: `docs/superpowers/specs/2026-08-20-test-design-basics-design.md`

## Global Constraints

- **1 トピック = 1 takeaway。** takeaway は CURRICULUM.md の表と一字一句同じ文を front-matter・「結論」スライド・「まとめ」スライド・doc.md の引用に使う
- スライドは `---` 区切りで **4〜6 枚**(機械検査)。コード例は **5 行以内・Python**(` ```python `)
- front-matter 必須: `id` / `title` / `takeaway` / `introduces` / `requires` / `header: "テスト設計入門"`
- 語彙台帳: `requires` に書く語は、それより前(自然順)のトピックの `introduces` に必ずある(`check_vocab.mjs` が落とす)。同じ語を二重に `introduces` しない
- 確認クイズ書式(崩すと seed が throw): `## 確認クイズ` 見出し + `### Q1.` / `- A.` / `<details><summary>答え</summary>` / `**B** — 解説` / `</details>`。**選択式 3〜5 問・選択肢 3 つ以上**。見出しや設問が無いと**黙って quiz が作られない**ので雛形からコピーする
- 各レッスンに `doc.md` と `practice.md` は**必須**(無いと manifest が落ちる)
- 教材本文に原典名(JSTQB / ISTQB)を書かない。クレジットは CURRICULUM.md のみ。`doc.md` 末尾「もっと知りたい人へ」の参考リンクは可(pytest 公式ドキュメント等)
- 外部ロゴ・図の流用禁止。図解を足す場合は `.claude/skills/diagram-design/` 準拠(本計画では図解は必須にしない。fe / git 講座と同じく後追い可)
- コミットは**モジュール単位**(`packages/content/CLAUDE.md` の指示)。コミット前に必ず検査を通す
- 検査コマンド(全タスク共通):
  - `bun run --filter=@falcon/content check:ci`(枚数・語彙・画像リンク)
  - `bun run test`(manifest: front-matter・クイズ書式・course.json)
- クイズの黙殺対策(全モジュールタスク共通): コミット前に次で全 practice.md にクイズ見出しと Q1 があることを確認する
  ```bash
  grep -rL "## 確認クイズ" packages/content/courses/test-design-basics/modules --include=practice.md; grep -rL "### Q1" packages/content/courses/test-design-basics/modules --include=practice.md
  ```
  (どちらも**出力なし**が合格)

## ディレクトリ名の確定表(全タスク共通の正本)

```
packages/content/courses/test-design-basics/modules/
├── m1-foundations/
│   ├── l1-purpose/            (1-1: t1-what-is-testing, t2-testing-vs-debugging, t3-qa-and-testing, t4-testing-is-a-process)
│   ├── l2-defects/            (1-2: t1-error, t2-defect-and-failure, t3-root-cause)
│   ├── l3-principles-1/       (1-3: t1-shows-presence-not-absence, t2-exhaustive-impossible, t3-early-testing, t4-defect-clustering)
│   └── l4-principles-2/       (1-4: t1-pesticide-paradox, t2-context-dependent, t3-zero-defects-fallacy)
├── m2-levels-types/
│   ├── l1-levels/             (2-1: t1-test-levels, t2-component-testing, t3-integration-testing, t4-system-testing, t5-acceptance-testing)
│   ├── l2-types/              (2-2: t1-functional, t2-non-functional, t3-blackbox, t4-whitebox)
│   ├── l3-change-related/     (2-3: t1-confirmation, t2-regression, t3-regression-automation)
│   └── l4-strategy-base/      (2-4: t1-shift-left, t2-test-pyramid, t3-ice-cream-cone, t4-quadrants)
├── m3-blackbox/
│   ├── l1-equivalence/        (3-1: t1-test-case-format, t2-equivalence-partition, t3-representative-value, t4-invalid-partition, t5-pytest-minimum)
│   ├── l2-boundary/           (3-2: t1-defects-at-boundaries, t2-two-value, t3-three-value, t4-parametrize)
│   ├── l3-decision-table/     (3-3: t1-condition-combinations, t2-writing-decision-tables, t3-rule-reduction, t4-table-to-code)
│   ├── l4-state-transition/   (3-4: t1-state-view, t2-state-diagram, t3-state-table, t4-transition-coverage, t5-transition-to-code)
│   └── l5-choosing/           (3-5: t1-choose-by-spec-shape, t2-combine-techniques, t3-tables-expose-spec-holes)
├── m4-whitebox-experience/
│   ├── l1-coverage/           (4-1: t1-what-is-coverage, t2-statement-coverage, t3-branch-coverage, t4-coverage-limits)
│   ├── l2-experience-based/   (4-2: t1-error-guessing, t2-checklist-based, t3-exploratory, t4-role-of-experience-based)
│   └── l3-acceptance/         (4-3: t1-acceptance-criteria, t2-given-when-then, t3-atdd, t4-ambiguous-specs)
├── m5-strategy-reporting/
│   ├── l1-automation/         (5-1: t1-automation-benefits, t2-automation-costs, t3-what-to-automate, t4-keep-humans-for-exploration)
│   ├── l2-risk-based/         (5-2: t1-product-risk, t2-risk-depth, t3-prioritization, t4-entry-exit-criteria)
│   ├── l3-defect-report/      (5-3: t1-report-purpose, t2-repro-steps, t3-expected-vs-actual, t4-severity-priority)
│   └── l4-reporting/          (5-4: t1-metrics, t2-test-report, t3-decision-material)
└── m6-capstone/
    └── l1-capstone/           (6-1: t1-test-conditions, t2-assign-techniques, t3-table-to-suite, t4-automation-proposal)
```

トピック ID は「レッスン番号-トピック番号」を CURRICULUM.md の表どおりに(例: `m3-blackbox/l2-boundary/t4-parametrize/slides.md` の front-matter は `id: 3-2-4`)。

## レッスン執筆の共通レシピ(全モジュールタスクで反復する)

1 レッスンにつき次の順で書く(1 トピック 15〜30 分目安):

1. `mkdir -p packages/content/courses/test-design-basics/modules/<module>/<lesson>/<topic>` を全トピック分
2. 各トピックの `slides.md`: `packages/content/templates/topic-slides-template.md` をコピーして埋める
   - `header` は `"テスト設計入門"` 固定。takeaway は CURRICULUM.md の文をそのまま
   - 構成: つかみの問い → 結論(takeaway) → 最小のコード or 具体例 → 対比・失敗例 → まとめ(takeaway 再掲)の 5 枚を基本形とする
   - コードが無い概念トピック(7 原則・レベル・戦略系)は「最小のコード」枠を**実務の具体例 1 つ**(表・箇条書き)に差し替える
3. レッスンの `doc.md`: `templates/doc-template.md` をコピー。トピックと 1:1 の見出し(`## X-Y-N タイトル`)+ takeaway 引用 + スライドと同じ例で再構成
4. レッスンの `practice.md`: `templates/practice-template.md` をコピーし、次の 3 部にする
   - `## 手元で試す`: Python + pytest の写経 + 改造課題(python-testing-ci-basics の `m1-pytest/l1-basics/practice.md` が文体の実例)。**M1・M2 など実行物が無いレッスンは「ケース表を書く」紙上ハンズオンに差し替える**
   - `## 演習問題` + `## 解答例と解説`(`<details>`)
   - `## 確認クイズ`: 3〜5 問。各トピックの takeaway を 1 問以上でカバーする
5. `bun run --filter=@falcon/content check:ci` を回す(語彙台帳エラーはトピック順・`introduces` の見直しで直す。**語を安易に足さない**)

---

### Task 1: 講座スキャフォールド + M1 テストの基礎(4 レッスン / 14 トピック)

**Files:**
- Create: `packages/content/courses/test-design-basics/course.json`
- Move: `docs/superpowers/specs/2026-08-20-test-design-basics-curriculum.md` → `packages/content/courses/test-design-basics/CURRICULUM.md`
- Create: `modules/m1-foundations/` 配下 4 レッスン(ディレクトリ確定表のとおり)

**Interfaces:**
- Produces: 講座の器(course.json / CURRICULUM.md)と M1 の語彙基盤。特に `introduces`: テスト, 品質, 欠陥, エラー, 故障, デバッグ, 品質保証, テスト設計, テストケース(概念のみ。書式は 3-1-1), 根本原因 — 後続モジュール全部がこれを `requires` する

- [ ] **Step 1: course.json を作る**(下記をそのまま)

```json
{
  "title": "テスト設計と品質保証 入門",
  "category": "プログラミング",
  "color": "green",
  "description": "仕様からテストケースを設計し、pytest のテストコードに落とし、何を自動化するかを根拠つきで提案できるようになる研修。",
  "header": "テスト設計入門",
  "tenantId": "ses",
  "modules": {
    "m1-foundations": "M1. テストの基礎",
    "m2-levels-types": "M2. 何をどこでテストするか",
    "m3-blackbox": "M3. テスト設計技法 I: ブラックボックス",
    "m4-whitebox-experience": "M4. テスト設計技法 II: コードと経験から",
    "m5-strategy-reporting": "M5. 自動テスト戦略と品質の報告",
    "m6-capstone": "M6. 総合演習"
  }
}
```

- [ ] **Step 2: CURRICULUM.md を移動して整える**

```bash
git mv docs/superpowers/specs/2026-08-20-test-design-basics-curriculum.md packages/content/courses/test-design-basics/CURRICULUM.md
```

冒頭の「THEME_TO_COURSE.md の STEP 4 成果物…実装開始までここに置く」の段落を削除し、設計書への相対リンクを `../../../../docs/superpowers/specs/2026-08-20-test-design-basics-design.md` に直す。クレジット節はそのまま残す。

- [ ] **Step 3: M1 の 4 レッスンを共通レシピで書く**(l1-purpose → l2-defects → l3-principles-1 → l4-principles-2 の順。takeaway は CURRICULUM.md の M1 表)
  - M1 は実行するコードが無いので、`practice.md` の「手元で試す」は「身の回りの欠陥/故障を 1 つ選び、エラー→欠陥→故障→根本原因の 4 行で書き分ける」等の紙上課題にする
  - l3/l4(7 原則)のスライドは、原則ごとに実務のあるある 1 例(例: 全数テスト不可能 → 8 文字パスワードの組み合わせ数)で支える
- [ ] **Step 4: 検査**

```bash
bun run --filter=@falcon/content check:ci
bun run test
grep -rL "## 確認クイズ" packages/content/courses/test-design-basics/modules --include=practice.md
```

Expected: check:ci と test が PASS、grep は出力なし。

- [ ] **Step 5: コミット**

```bash
git add packages/content/courses/test-design-basics docs/superpowers/specs
git commit -m "feat(content): テスト設計講座の器と M1 テストの基礎を追加"
```

### Task 2: M2 何をどこでテストするか(4 レッスン / 16 トピック)

**Files:**
- Create: `modules/m2-levels-types/` 配下 4 レッスン(確定表のとおり)

**Interfaces:**
- Consumes: M1 の語彙(テスト, 欠陥, 品質 など)
- Produces: `introduces`: テストレベル, コンポーネントテスト, 統合テスト, システムテスト, 受け入れテスト, テストタイプ, 機能テスト, 非機能テスト, ブラックボックス, ホワイトボックス, 確認テスト, リグレッションテスト, 自動テスト, シフトレフト, テストピラミッド, E2E, テストの四象限 — M3〜M6 が要求する

- [ ] **Step 1: 4 レッスンを共通レシピで書く**(l1-levels → l2-types → l3-change-related → l4-strategy-base)
  - 具体例は「会員登録フォーム + 料金計算 API」の題材で統一する(M6 capstone と同じ世界観。先に薄く登場させる)
  - `practice.md` は紙上課題(例: 「この不具合修正で確認テストとリグレッションテストは何をするか書く」「自分の携わる(想定)プロダクトのテストをピラミッドに置く」)
- [ ] **Step 2: 検査**(Task 1 Step 4 と同じ 3 コマンド、Expected 同じ)
- [ ] **Step 3: コミット**

```bash
git add packages/content/courses/test-design-basics
git commit -m "feat(content): テスト設計講座 M2 何をどこでテストするか"
```

### Task 3: M3 ブラックボックス技法(5 レッスン / 21 トピック)

**Files:**
- Create: `modules/m3-blackbox/` 配下 5 レッスン(確定表のとおり)

**Interfaces:**
- Consumes: M1・M2 の語彙(ブラックボックス, テストケース(概念) など)
- Produces: `introduces`: テストケースの 3 要素(入力・手順・期待結果), 同値パーティション, 代表値, 無効同値パーティション, pytest, assert, テスト関数, 境界値, 境界値分析, parametrize, デシジョンテーブル, 条件, ルール, 簡約, 状態, 状態遷移, 状態遷移図, 状態遷移表, 遷移カバレッジ — M4〜M6 が要求する。**本講座の心臓部**

- [ ] **Step 1: 5 レッスンを共通レシピで書く**(l1-equivalence → l2-boundary → l3-decision-table → l4-state-transition → l5-choosing)
  - 題材は統一する: 同値分割・境界値 = 「送料計算: 購入額 3,000 円以上で送料無料」/ デシジョンテーブル = 「会員区分 × クーポン有無の割引」/ 状態遷移 = 「注文ステータス(受付→支払済→発送済→キャンセル)」
  - pytest 橋渡しトピック(3-1-5, 3-2-4, 3-3-4, 3-4-5)のコード例はそのまま手元で `pytest` 実行できる完結形にする。例(3-2-4):

```python
import pytest
from shipping import shipping_fee

@pytest.mark.parametrize("total, expected", [
    (2999, 500),   # 境界の内側: 有料
    (3000, 0),     # 境界: 無料
])
def test_shipping_fee(total, expected):
    assert shipping_fee(total) == expected
```

  - `practice.md` の「手元で試す」はここから 2 段構え: ①仕様からケース表を書く → ②表を pytest に写して実行する(python-testing-ci-basics の文体に合わせる)
- [ ] **Step 2: 検査**(共通 3 コマンド)
- [ ] **Step 3: コミット**

```bash
git add packages/content/courses/test-design-basics
git commit -m "feat(content): テスト設計講座 M3 ブラックボックス技法"
```

### Task 4: フェーズ 1 ゲート — ローカル LMS で目視確認

**Files:** なし(検証のみ)

- [ ] **Step 1: seed してローカルで確認**

```bash
bun run db:migrate && bun run db:seed
bun run dev:api   # 別プロセス
bun run dev       # 別プロセス
```

- [ ] **Step 2: LMS 上のチェックリスト**(`ADDING_COURSE.md` の確認チェックリスト準拠)
  - コース一覧に「テスト設計と品質保証 入門」と既存 7 講座が全部出る
  - セクション順が M1 → M2 → M3(ディレクトリ順)
  - 各レッスンが スライド → まとめ → 確認クイズ の順で、**13 レッスン全部にクイズがある**(黙殺の目視確認)
  - クイズが解けて合格点 80
- [ ] **Step 3: 問題があれば該当モジュールを直して再 seed、無ければ次へ**(コミットは不要。修正した場合のみ `fix(content):` でコミット)

### Task 5: M4 コードと経験から(3 レッスン / 12 トピック)

**Files:**
- Create: `modules/m4-whitebox-experience/` 配下 3 レッスン(確定表のとおり)

**Interfaces:**
- Consumes: M2(ホワイトボックス, 受け入れテスト)、M3(pytest, テストケース)
- Produces: `introduces`: カバレッジ, ステートメントカバレッジ, ブランチカバレッジ, エラー推測, チェックリスト, 探索的テスト, ユーザーストーリー, 受け入れ基準, Given-When-Then, ATDD — M5・M6 が要求する

- [ ] **Step 1: 3 レッスンを共通レシピで書く**(l1-coverage → l2-experience-based → l3-acceptance)
  - カバレッジのコード例は if 1 つの 4 行関数で「行 100% でも分岐漏れ」を見せる(`pytest --cov` はスコープ外の機能解説になるため出さない。概念は表で示す)
  - l2 の `practice.md` は「M3 で書いた送料計算のケース表に、チェックリスト(空・0・負数・重複・長すぎ)で漏れを 3 つ足す」— M3 成果物を再利用して理解を接続する
- [ ] **Step 2: 検査**(共通 3 コマンド)
- [ ] **Step 3: コミット**

```bash
git add packages/content/courses/test-design-basics
git commit -m "feat(content): テスト設計講座 M4 コードと経験から"
```

### Task 6: M5 自動テスト戦略と品質の報告(4 レッスン / 15 トピック)

**Files:**
- Create: `modules/m5-strategy-reporting/` 配下 4 レッスン(確定表のとおり)

**Interfaces:**
- Consumes: M2(リグレッションテスト, テストピラミッド)、M3(pytest)、M4(探索的テスト, カバレッジ)
- Produces: `introduces`: 自動化, 保守コスト, プロダクトリスク, リスクベースドテスト, 優先順位, 開始基準, 終了基準, 欠陥レポート, 再現手順, 深刻度, 優先度, テストメトリクス, テストレポート — M6 が要求する

- [ ] **Step 1: 4 レッスンを共通レシピで書く**(l1-automation → l2-risk-based → l3-defect-report → l4-reporting)
  - l3 の `practice.md` は「悪い欠陥レポート(『検索が動きません』)を再現手順・期待・実際・環境の 4 部に書き直す」演習を必ず入れる(到達目標④を直接測る)
- [ ] **Step 2: 検査**(共通 3 コマンド)
- [ ] **Step 3: コミット**

```bash
git add packages/content/courses/test-design-basics
git commit -m "feat(content): テスト設計講座 M5 自動テスト戦略と品質の報告"
```

### Task 7: M6 総合演習(1 レッスン / 4 トピック)

**Files:**
- Create: `modules/m6-capstone/l1-capstone/` (確定表のとおり)

**Interfaces:**
- Consumes: 全モジュールの語彙(観点出し→技法割当→pytest→提案書の流れで M1〜M5 を総動員)

- [ ] **Step 1: capstone を書く**
  - スライド 4 本は「進め方の手本」: 仮想案件(会員登録フォーム + 料金計算 API)の仕様書を M2 から使ってきた世界観で 1 枚に固定し、観点出し → 技法割当 → スイート化 → 提案書の順に見せる
  - `practice.md` が本体: 仕様書全文 + 成果物 4 点(観点一覧 / 技法割当表 / pytest スイート / 自動化提案書 1 枚)の課題と、`<details>` の解答例一式
  - 確認クイズは全範囲横断で 5 問(fe の模擬試験方式。範囲がレッスンに閉じない意図的な例外であることを CURRICULUM.md 側の注記で明示)
- [ ] **Step 2: 検査**(共通 3 コマンド)
- [ ] **Step 3: コミット**

```bash
git add packages/content/courses/test-design-basics
git commit -m "feat(content): テスト設計講座 M6 総合演習"
```

### Task 8: サムネイル

**Files:**
- Modify: `packages/content/scripts/build_thumbnails.py`(`SPECS` に 1 件追加)
- Create: `packages/content/courses/test-design-basics/thumbnail.webp`(スクリプト生成物)

- [ ] **Step 1: SPECS に追加**(`title` / `title_size` / `subtitle` / `motif` の 4 つ。eyebrow と配色は course.json から引かれる)
  - motif は講座の中身 1 つだけ: 「仕様の範囲と境界値 2 点を打つ図」(数直線 + 境界マーカー)を skin トークンで描く。既存 7 件の motif 実装を参考にする。外部ロゴ禁止
- [ ] **Step 2: 生成と検査**

```bash
pip install pillow playwright && playwright install chromium   # 未導入なら
python packages/content/scripts/build_thumbnails.py test-design-basics
bun run content:check
```

Expected: `thumbnail.webp` が生成され、content:check が PASS(16:9 / 400KB 以内)。8 枚が 1 シリーズに見えるかは既存サムネイルと並べて目視。

- [ ] **Step 3: コミット**

```bash
git add packages/content/scripts/build_thumbnails.py packages/content/courses/test-design-basics/thumbnail.webp
git commit -m "feat(content): テスト設計講座のサムネイルを追加"
```

### Task 9: ドキュメント更新と最終検証

**Files:**
- Modify: `AGENTS.md`(seed される講座一覧に `test-design-basics` を追記 — 2 箇所: 「seed-learner is enrolled in each content course」の列挙と教材画像の講座数)
- Modify: `packages/content/CLAUDE.md`(「現在の状態」に講座の 1 段落を追加。既存講座の段落と同じ体裁: 規模 / CURRICULUM.md へのリンク / コード演習なしの理由 = Python はランナー対象外 / クレジットは CURRICULUM.md)
- Modify: `packages/content/ADDING_COURSE.md`(サムネイル節の「7 講座」表記を「8 講座」に)

- [ ] **Step 1: 3 ファイルを更新する**(上記のとおり)
- [ ] **Step 2: 最終検証**

```bash
bun run lint
bun run typecheck
bun run test
bun run --filter=@falcon/content check:ci
bun run db:seed
```

Expected: すべて PASS。seed 出力に test-design-basics のコース・レッスン・クイズが出る。

- [ ] **Step 3: LMS 最終目視**(Task 4 のチェックリストを全 21 レッスンで再実施。講師ロールで受講者登録ができることも確認)
- [ ] **Step 4: コミット**

```bash
git add AGENTS.md packages/content/CLAUDE.md packages/content/ADDING_COURSE.md
git commit -m "docs: テスト設計講座をドキュメントに反映"
```

---

## 自己レビュー結果(spec 照合)

- 設計書の要件 → タスク対応: 要件シート(Task 1 course.json / CURRICULUM.md)、6 モジュール(Task 1〜7)、2 段ハンズオン(Task 3 レシピ)、欠陥レポート演習 = 到達目標④(Task 6)、capstone = 到達目標③(Task 7)、フェーズ分け(Task 4 がフェーズ 1 ゲート)、サムネイル(Task 8)、ドキュメント(Task 9)— 漏れなし
- コード演習なし(`exercises` を書かない)は course.json(Task 1)で満たす
- 図解 SVG は必須にしない判断を Global Constraints に明記(fe / git 講座と同じ後追い方針)
