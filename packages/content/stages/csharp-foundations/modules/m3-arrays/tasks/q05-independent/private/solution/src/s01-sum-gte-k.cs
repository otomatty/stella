public static partial class Answers
{
    public static int S01SumGteK(int[] a, int k)
    {
        int s = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= k)
            {
                s = s + a[i];
            }
        }
        return s;
    }
}
