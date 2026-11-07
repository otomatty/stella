public static partial class Answers
{
    public static int CheckCCountMax(int[] a)
    {
        int m = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] > m)
            {
                m = a[i];
            }
        }
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] == m)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
