# 条件の誤りを直す

`src/<id>.cs` に、その問題のメソッドを 1 つ書きます。クラスは `public static partial class Answers` です。プログラムの入口と、メソッドを呼び出す行は書きません。テストがメソッドを呼びます。

1 問確認して提出し、次の問題へ進みます。全部の問題を提出すると、この課題は合格になります。

誤りのあるコードが、すでに `R1Fee` と `R2Label` に入っています。問題文の `Fee` が `R1Fee`、`Label` が `R2Label` です。仕様に合うよう、そのメソッドを直します。

| 問題 | ファイル | メソッド |
| --- | --- | --- |
| R1 | `src/r1-fee.cs` | `public static int R1Fee(int age)` |
| R2 | `src/r2-label.cs` | `public static string R2Label(int n)` |
