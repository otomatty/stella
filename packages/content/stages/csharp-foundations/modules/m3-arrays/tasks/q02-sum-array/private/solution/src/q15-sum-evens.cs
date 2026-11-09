public static partial class Answers
{
    public static int Q15SumEvens(int[] a)
    {
        int s = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] % 2 == 0)
            {
                s = s + a[i];
            }
        }
        return s;
    }
}
