public static partial class Answers
{
    public static int S09MinExceptZero(int[] a)
    {
        int found = 0;
        int m = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] != 0)
            {
                if (found == 0)
                {
                    m = a[i];
                    found = 1;
                }
                else if (a[i] < m)
                {
                    m = a[i];
                }
            }
        }
        if (found == 0)
        {
            return -1;
        }
        return m;
    }
}
