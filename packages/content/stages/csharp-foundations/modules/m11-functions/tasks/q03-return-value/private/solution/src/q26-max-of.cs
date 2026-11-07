// Q26 配列の最大
// 戻り値は int または string。表示せず return する。
// 引数: int[] a（1個以上）
// 例: {3,9,4} → 9

public static partial class Answers
{
    public static int Q26MaxOf(int[] a)
    {
        int m = a[0];
        for (int i = 1; i < a.Length; i++)
        {
            if (a[i] > m) m = a[i];
        }
        return m;
    }
}
