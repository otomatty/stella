public static partial class Answers
{
    public static int S05SumOddIndex(int[] a)
    {
        int s = 0;
        for (int i = 1; i < a.Length; i = i + 2)
        {
            s = s + a[i];
        }
        return s;
    }
}
