// R2 連続する1
// 0と1の配列aで、1が連続する個数の最大を返す。空なら0。

public static partial class Answers
{
    public static int R2Longest(int[] a)
    {
        int current = 0;
        int best = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] == 1) current++;
            else current = 0;
            best = current;
        }
        return best;
    }
}
