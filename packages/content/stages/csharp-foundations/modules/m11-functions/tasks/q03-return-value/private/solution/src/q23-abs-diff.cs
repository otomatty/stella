// Q23 差の絶対値
// 戻り値は int または string。表示せず return する。
// 例: (10, 3) → 7 / (3, 10) → 7 / (4, 4) → 0

public static partial class Answers
{
    public static int Q23AbsDiff(int a, int b)
    {
        int d = a - b;
        if (d < 0) d = -d;
        return d;
    }
}
