# C# の課題 (`dotnet-test`)

ランナーの決めごとは `templates/runners/README.md` の「C# (`dotnet-test/`)」が正本です。ここは、既存の C# 教材をそのテンプレートへ移すときの書き方です。

## テンプレートの形

`templates/runners/dotnet-test/` を scaffold で課題へ写します。受講者が編集するのは `src/Answers.cs` です。次は配布した設定で、`protected` に入っています。

| ファイル | 役割 |
| --- | --- |
| `Task.csproj` | `net10.0`。xUnit。lockfile で復元する |
| `packages.lock.json` | 依存の固定。受講者に更新させない |
| `Directory.Build.props` | ビルド出力を `.stella/dotnet/` にする。これがあると、学習フォルダーの親の props は読み込まれない |
| `Directory.Build.targets` | 中身は空。親の targets を読み込まない |
| `NuGet.config` | 取得元は nuget.org (`https://api.nuget.org/v3/index.json`) だけ |
| `tests/ConsoleOutput.cs` | `Console.SetOut` で出力を取り、`\r\n` を `\n` にそろえる |
| `tests/TestSettings.cs` | 出力を差し替えるテストが混ざらないよう、並列実行を止める |
| `tests/AnswersTests.cs` | 課題のテスト。中身は課題に合わせて書き換える |

`checks.lint` と `checks.format` は `false` です。ESLint と Prettier は C# を検査しません。

拡張の手順は `dotnet restore --locked-mode`、`dotnet build`、`dotnet test` (結果は TRX) です。課題のファイルにコマンドを書かないでください。

## 受講者のコード

トップレベルのステートメントは、テストと同じプロジェクトでは使えません。受講者のコードは、クラスの static メソッドにします。テンプレートは `public static class Answers` です。

既存の教材がトップレベルで `Console.WriteLine` まで書いているときは、課題文に、同じ処理を `Answers` のメソッドへ移す書き方を示します。プログラムの入口を自分で書く課題にはしません。

.NET SDK 10 が要ります。環境台帳の `requirements.dotnet` は `{ "min": "10.0.100", "majors": [10] }` です。.NET 11 の SDK だけでは `net10.0` のテストを動かせません。

## 戻り値の問題

問題集の「入力 → 期待する値」は、`[Theory]` と `[InlineData]` にします。`DisplayName` は日本語で、問題番号と題を入れます。拡張の結果の画面に、この文字列がそのまま出ます。

問題集の 1 行が `4 → 1,2,3,4` と `1 → 1` なら、戻り値の文字列として次です。

```csharp
[Theory(DisplayName = "Q01 1 から n をカンマでつなぐ")]
[InlineData(4, "1,2,3,4")]
[InlineData(1, "1")]
public void Q01_Join(int n, string expected)
{
    Assert.Equal(expected, Answers.Q01(n));
}
```

1 課題に 10 問あるときは、テストクラスは 1 つにし、問題ごとにメソッドを分けます。Q01 から Q10 までを 1 つのメソッドにまとめないでください。どの問題が落ちたかが、メソッドと DisplayName で分かれます。

## 表示の問題

画面に出す問題は `ConsoleOutput.Capture` で比べます。期待する文字列の改行は `\n` です。`Console.WriteLine` は行末にも改行を付けるので、1 から 4 を 1 行ずつ出すなら期待値は `"1\n2\n3\n4\n"` です。

```csharp
[Fact(DisplayName = "Q02 1 から n を 1 行ずつ表示する")]
public void Q02_CountUp()
{
    Assert.Equal("1\n2\n3\n4\n", ConsoleOutput.Capture(() => Answers.Q02(4)));
}
```

境界 (0 件、空、範囲の端) は、同じ問題の `[InlineData]` に足すか、表示なら別の `[Fact]` にします。例外を期待する問題は `Assert.Throws` で、その問題のメソッドに書きます。典型的な誤答 (境界を 1 つずらす、改行を忘れる) は、類題の `private/mutants/` に置きます。

## 解答例と検査

`private/solution/src/Answers.cs` に、テストが通る実装を置きます。starter の `Answers.cs` は、受講者が埋める前の形にします。テンプレートの `Answers.cs` は最初から通る見本なので、課題にするときに穴を空けます。

`content:check` は解答例を本物の `dotnet test` で実行します。類題の誤答は、解答例に重ねて実行し、不合格になることまで見ます。手元に .NET SDK 10 が無いと、この検査は環境の不足で止まります。テストの期待値を緩めて通さないでください。
