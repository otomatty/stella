// Q13 未満
// 整数 n を受け取り、0 未満なら under、0 以上なら ok を返す。
// 例: -1 → under / 0 → ok / 5 → ok

public static partial class Answers
{
    public static string Q13UnderZero(int n)
    {
        if (n < 0)
        {
            return "under";
        }
        else
        {
            return "ok";
        }
    }
}
