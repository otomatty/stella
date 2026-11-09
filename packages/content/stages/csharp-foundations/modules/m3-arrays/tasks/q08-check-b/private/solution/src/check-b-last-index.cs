public static partial class Answers
{
    public static int CheckBLastIndex(int[] a, int k)
    {
        int last = -1;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] == k)
            {
                last = i;
            }
        }
        return last;
    }
}
