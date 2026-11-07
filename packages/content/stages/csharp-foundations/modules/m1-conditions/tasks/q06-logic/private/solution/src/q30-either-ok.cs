// Q30 または
// 整数 a, b を受け取り、どちらかが 60 以上なら ok、そうでなければ ng を返す。
// 例: 60, 10 → ok / 10, 60 → ok / 59, 59 → ng

public static partial class Answers
{
    public static string Q30EitherOk(int a, int b)
    {
        if (a >= 60 || b >= 60)
        {
            return "ok";
        }
        else
        {
            return "ng";
        }
    }
}
