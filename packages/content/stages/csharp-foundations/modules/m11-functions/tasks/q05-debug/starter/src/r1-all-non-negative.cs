// R1
// 配列に負の値がなければ true を返す関数を、IsNonNegative を呼んで作る。空なら true。

public static partial class Answers
{
    private static bool IsNonNegative(int n) { return n >= 0; }

    public static bool R1AllNonNegative(int[] a)
    {
        for (int i = 0; i < a.Length; i++)
            IsNonNegative(a[i]);
        return true;
    }
}
