public static partial class Answers
{
    public static int Q21CountGteK(int[] a, int k)
    {
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= k)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
