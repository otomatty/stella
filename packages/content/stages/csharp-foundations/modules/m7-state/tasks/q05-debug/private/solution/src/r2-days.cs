// R2
// 初期値xを毎回d増やし、t以上になるまでの回数を返す。0≦x,t≦100、1≦d≦10。

public static partial class Answers
{
    public static int R2Days(int x, int t, int d)
    {
        int days = 0;
        while (x < t)
        {
            x += d;
            days++;
        }
        return days;
    }
}
