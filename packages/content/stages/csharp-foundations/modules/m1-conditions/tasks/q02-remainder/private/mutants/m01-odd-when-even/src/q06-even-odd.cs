// Q06 ★ 偶数と奇数
// 整数 n を受け取り、偶数なら even、奇数なら odd を返す。
// 例: 7 → odd / 8 → even / 0 → even

public static partial class Answers
{
    public static string Q06EvenOdd(int n)
    {
        if (n % 2 == 0)
        {
            return "odd";
        }
        else
        {
            return "even";
        }
    }
}
