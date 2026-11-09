// 確認C
// 初期量xが毎回3倍になる。目標t以上になるまでの回数を返す。1≦x,t≦1000。
// 例: 2, 20 → 3

public static partial class Answers
{
    public static int CheckCTripleDays(int x, int t)
    {
        int days = 0;
        while (x <= t)
        {
            x = x * 3;
            days++;
        }
        return days;
    }
}
