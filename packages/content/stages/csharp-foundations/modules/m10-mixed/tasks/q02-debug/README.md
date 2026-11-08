# 境界と最大を直す

`src/<id>.cs` に、その問題のメソッドを 1 つ書きます。クラスは `public static partial class Answers` です。プログラムの入口と、メソッドを呼び出す行は書きません。テストがメソッドを呼びます。

1 問確認して提出し、次の問題へ進みます。全部の問題を提出すると、この課題は合格になります。

R1 は配列と k を受け取り、大きい順の k 番目以上の人数を返します。R2 は 0 と 1 の配列を受け取り、1 が連続する最大の個数を返します。入っているコードを、仕様に合うところだけ直します。

| 問題 | ファイル | メソッド |
| --- | --- | --- |
| R1 | `src/r1-winners.cs` | `public static int R1Winners(int[] a, int k)` |
| R2 | `src/r2-longest.cs` | `public static int R2Longest(int[] a)` |
