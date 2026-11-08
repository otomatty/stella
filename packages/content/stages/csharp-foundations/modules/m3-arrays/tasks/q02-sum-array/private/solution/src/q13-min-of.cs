public static partial class Answers
{
    public static int Q13MinOf(int[] a)
    {
        int m = a[0];
        for (int i = 1; i < a.Length; i++)
        {
            if (a[i] < m)
            {
                m = a[i];
            }
        }
        return m;
    }
}
