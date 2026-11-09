public static partial class Answers
{
    public static int Q29CountInRange(int[] a, int l, int r)
    {
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= l && a[i] <= r)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
