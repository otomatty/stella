---
sourceRefs: []
---
## 知識問題

### Q1. このステージで受講者が編集するファイルはどれですか？
<!-- kind: single; skills: csharp-task-workflow -->

- A. 問題ごとの `src/<id>.cs`
- B. `tests/<id>.test.cs`

<details>
<summary>解答</summary>

**A** — テストとプロジェクトの設定は配布されたままにします。書くのは、1 問 1 ファイルの `src/<id>.cs` です。

</details>

### Q2. 課題のプログラムの入口は、受講者が書きます。
<!-- kind: boolean; skills: csharp-task-workflow -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — テストがメソッドを呼びます。入口と呼び出しは書きません。

</details>

### Q3. このステージのテストを動かす SDK はどれですか？
<!-- kind: single; skills: csharp-task-workflow -->

- A. .NET SDK 10
- B. .NET SDK 11 だけ

<details>
<summary>解答</summary>

**A** — 課題は `net10.0` です。11 の SDK だけでは実行できません。

</details>
