// S06 距離と上限
// 整数a,b,kを受け取り、aとbの差の絶対値がk以下ならnear、それ以外farを返す。a,bは-100〜100、0≦k≦100。
// 例: 8,3,5→near、3,8,4→far

public static partial class Answers
{
    public static string S06Near(int a, int b, int k)
    {
        int diff;
        if (a >= b)
        {
            diff = a - b;
        }
        else
        {
            diff = b - a;
        }
        if (diff <= k)
        {
            return "near";
        }
        else
        {
            return "far";
        }
    }
}
