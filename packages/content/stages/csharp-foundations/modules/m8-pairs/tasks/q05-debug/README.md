# 内側の始め方を直す

`src/<id>.cs` に、その問題のメソッドを 1 つ書きます。クラスは `public static partial class Answers` です。プログラムの入口と、メソッドを呼び出す行は書きません。テストがメソッドを呼びます。

1 問確認して提出し、次の問題へ進みます。全部の問題を提出すると、この課題は合格になります。

R1 は配列と k を受け取り、組の数を返します。R2 は二つの配列と k を受け取り、組の数を返します。入っているコードを、仕様に合うところだけ直します。

| 問題 | ファイル | メソッド |
| --- | --- | --- |
| R1 | `src/r1-pairs.cs` | `public static int R1Pairs(int[] a, int k)` |
| R2 | `src/r2-across.cs` | `public static int R2Across(int[] a, int[] b, int k)` |
