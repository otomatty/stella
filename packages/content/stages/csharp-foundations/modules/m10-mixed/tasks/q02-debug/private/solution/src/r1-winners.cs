// R1 上位の人数
// 1個以上の点数配列aで、大きい順のk番目以上の人数を返す。同点を全員含める。1≦k≦a.Length。

public static partial class Answers
{
    public static int R1Winners(int[] a, int k)
    {
        int[] b = new int[a.Length];
        for (int i = 0; i < a.Length; i++) b[i] = a[i];
        Array.Sort(b);
        int border = b[b.Length - k];
        int count = 0;
        for (int i = 0; i < a.Length; i++)
            if (a[i] >= border) count++;
        return count;
    }
}
