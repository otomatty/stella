// Q14 ゼロか
// 整数 n を受け取り、0 なら zero、そうでなければ nonzero を返す。
// 例: 0 → zero / 1 → nonzero / -1 → nonzero

public static partial class Answers
{
    public static string Q14ZeroCheck(int n)
    {
        if (n == 0)
        {
            return "zero";
        }
        else
        {
            return "nonzero";
        }
    }
}
