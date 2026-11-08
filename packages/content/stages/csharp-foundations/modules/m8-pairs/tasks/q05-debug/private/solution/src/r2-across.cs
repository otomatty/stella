// R2
// 二つの配列a,bから1個ずつ選び、和がkの組を数える。どちらも1個以上。

public static partial class Answers
{
    public static int R2Across(int[] a, int[] b, int k)
    {
        int count = 0;
        for (int i = 0; i < a.Length; i++)
        {
            for (int j = 0; j < b.Length; j++)
            {
                if (a[i] + b[j] == k) count++;
            }
        }
        return count;
    }
}
