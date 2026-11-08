// Q26 差の絶対値
// 整数 a, b を受け取り、大きい方から小さい方を引いた値を返す。
// 例: 10, 3 → 7 / 3, 10 → 7 / 4, 4 → 0

public static partial class Answers
{
    public static int Q26AbsDiff(int a, int b)
    {
        if (a >= b)
        {
            return a - b;
        }
        else
        {
            return b - a;
        }
    }
}
