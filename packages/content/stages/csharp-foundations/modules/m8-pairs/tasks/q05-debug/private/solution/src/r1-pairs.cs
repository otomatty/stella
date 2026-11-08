// R1
// 整数配列aの異なる二つの位置で、和がkになる組の数を返す。順序違いは同じ組。

public static partial class Answers
{
    public static int R1Pairs(int[] a, int k)
    {
        int count = 0;
        for (int i = 0; i < a.Length; i++)
        {
            for (int j = i + 1; j < a.Length; j++)
            {
                if (a[i] + a[j] == k) count++;
            }
        }
        return count;
    }
}
