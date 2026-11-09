// Q29 ★ 範囲
// 整数 n を受け取り、5 以上 11 以下なら in、それ以外は out を返す。
// 例: 5 → in / 11 → in / 4 → out / 12 → out

public static partial class Answers
{
    public static string Q29InRange(int n)
    {
        if (n >= 5 && n <= 11)
        {
            return "in";
        }
        else
        {
            return "out";
        }
    }
}
