public static partial class Answers
{
    public static int S07CountSameNeighbors(int[] a)
    {
        int c = 0;
        for (int i = 0; i < a.Length - 1; i++)
        {
            if (a[i] == a[i + 1])
            {
                c = c + 1;
            }
        }
        return c;
    }
}
