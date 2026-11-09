public static partial class Answers
{
    public static int R2Count(int[] a, int k)
    {
        int count = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= k)
            {
                count = count + 1;
            }
        }
        return count;
    }
}
