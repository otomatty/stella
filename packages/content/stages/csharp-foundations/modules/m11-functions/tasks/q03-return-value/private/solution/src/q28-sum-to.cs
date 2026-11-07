// Q28 1から n の合計
// 戻り値は int または string。表示せず return する。
// 引数: int n
// 例: 4 → 10 / 10 → 55

public static partial class Answers
{
    public static int Q28SumTo(int n)
    {
        int s = 0;
        for (int i = 1; i <= n; i++) s = s + i;
        return s;
    }
}
