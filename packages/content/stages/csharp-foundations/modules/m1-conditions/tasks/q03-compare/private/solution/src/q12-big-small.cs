// Q12 ★ より大きい
// 整数 n を受け取り、100 より大きいなら big、100 以下なら small を返す。
// 例: 101 → big / 100 → small / 99 → small

public static partial class Answers
{
    public static string Q12BigSmall(int n)
    {
        if (n > 100)
        {
            return "big";
        }
        else
        {
            return "small";
        }
    }
}
