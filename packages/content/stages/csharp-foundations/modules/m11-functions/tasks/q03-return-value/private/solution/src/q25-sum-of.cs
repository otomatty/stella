// Q25 配列の合計
// 戻り値は int または string。表示せず return する。
// 引数: int[] a
// 例: {3,9,4} → 16

public static partial class Answers
{
    public static int Q25SumOf(int[] a)
    {
        int s = 0;
        for (int i = 0; i < a.Length; i++) s = s + a[i];
        return s;
    }
}
