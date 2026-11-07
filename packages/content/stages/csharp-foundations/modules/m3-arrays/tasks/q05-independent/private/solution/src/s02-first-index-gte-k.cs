public static partial class Answers
{
    public static int S02FirstIndexGteK(int[] a, int k)
    {
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= k)
            {
                return i;
            }
        }
        return -1;
    }
}
