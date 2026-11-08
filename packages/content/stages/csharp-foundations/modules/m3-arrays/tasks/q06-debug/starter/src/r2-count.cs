// R2
//
// 配列aのk以上の要素の個数を返す。空の配列もある。

public static partial class Answers
{
    public static int R2Count(int[] a, int k)
    {
        int count = 0;
        for (int i = 0; i < a.Length; i++)
            if (a[i] >= k) count += i;
        return count;
    }
}
