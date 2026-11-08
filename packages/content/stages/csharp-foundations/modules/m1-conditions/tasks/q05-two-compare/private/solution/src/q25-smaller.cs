// Q25 小さい方
// 整数 a, b を受け取り、小さい方を返す。同じならその値。
// 例: 3, 10 → 3 / 10, 3 → 3 / 4, 4 → 4

public static partial class Answers
{
    public static int Q25Smaller(int a, int b)
    {
        if (a <= b)
        {
            return a;
        }
        else
        {
            return b;
        }
    }
}
