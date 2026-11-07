// Q24 ★ 大きい方
// 整数 a, b を受け取り、小さくない方を返す。同じならその値。
// 例: 3, 10 → 10 / 10, 3 → 10 / 4, 4 → 4

public static partial class Answers
{
    public static int Q24Larger(int a, int b)
    {
        if (a >= b)
        {
            return b;
        }
        else
        {
            return a;
        }
    }
}
