// S06 単位をそろえる
// 時 h と分 m から合計分数を返す ToMinutes を作る。これを 2 回呼んで二つの時刻の差の絶対値を返す関数を作る。0≦h≦23、0≦m≦59。
// 例: 9,50,10,10→20

public static partial class Answers
{
    public static int S06MinuteDiff(int h1, int m1, int h2, int m2)
    {
        static int ToMinutes(int hour, int minute)
        {
            return hour * 60 + minute;
        }
        int d = ToMinutes(h1, m1) - ToMinutes(h2, m2);
        if (d < 0) d = -d;
        return d;
    }
}
