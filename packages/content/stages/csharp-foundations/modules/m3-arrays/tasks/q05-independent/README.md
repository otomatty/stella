# 配列の処理を自分で選ぶ

`src/<id>.cs` に、その問題のメソッドを 1 つ書きます。クラスは `public static partial class Answers` です。プログラムの入口と、メソッドを呼び出す行は書きません。テストがメソッドを呼びます。

1 問確認して提出し、次の問題へ進みます。全部の問題を提出すると、この課題は合格になります。

S06 と S10 は `void` で 2 行出します。S08 は `string` で `yes` か `no` を返します。ほかは `int` です。空の配列を直接 a[0] で読まない問題があります。

| 問題 | ファイル | メソッド |
| --- | --- | --- |
| S01 | `src/s01-sum-gte-k.cs` | `public static int S01SumGteK(int[] a, int k)` |
| S02 | `src/s02-first-index-gte-k.cs` | `public static int S02FirstIndexGteK(int[] a, int k)` |
| S03 | `src/s03-range-of.cs` | `public static int S03RangeOf(int[] a)` |
| S04 | `src/s04-sum-excess.cs` | `public static int S04SumExcess(int[] a, int k)` |
| S05 | `src/s05-sum-odd-index.cs` | `public static int S05SumOddIndex(int[] a)` |
| S06 | `src/s06-print-neg-count-and-nonneg-sum.cs` | `public static void S06PrintNegCountAndNonnegSum(int[] a)` |
| S07 | `src/s07-count-same-neighbors.cs` | `public static int S07CountSameNeighbors(int[] a)` |
| S08 | `src/s08-all-in-range.cs` | `public static string S08AllInRange(int[] a, int l, int r)` |
| S09 | `src/s09-min-except-zero.cs` | `public static int S09MinExceptZero(int[] a)` |
| S10 | `src/s10-print-up-down.cs` | `public static void S10PrintUpDown(int[] a)` |
