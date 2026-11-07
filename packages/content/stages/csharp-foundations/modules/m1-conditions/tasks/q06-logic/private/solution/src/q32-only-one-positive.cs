// Q32 片方だけ正
// 整数 a, b を受け取り、ちょうど一方だけが 0 より大きいなら one、それ以外は other を返す。
// 例: 1, -1 → one / 1, 2 → other / -1, -2 → other / 5, 0 → one

public static partial class Answers
{
    public static string Q32OnlyOnePositive(int a, int b)
    {
        if ((a > 0 && b <= 0) || (a <= 0 && b > 0))
        {
            return "one";
        }
        else
        {
            return "other";
        }
    }
}
