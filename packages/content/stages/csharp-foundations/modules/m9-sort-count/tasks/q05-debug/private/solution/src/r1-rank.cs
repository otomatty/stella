// R1 順位
// 整数配列aを小さい順に並べ、1始まりのk番目を返す。1≦k≦a.Length。

public static partial class Answers
{
    public static int R1Rank(int[] a, int k)
    {
        int[] b = new int[a.Length];
        for (int i = 0; i < a.Length; i++) b[i] = a[i];
        Array.Sort(b);
        return b[k - 1];
    }
}
