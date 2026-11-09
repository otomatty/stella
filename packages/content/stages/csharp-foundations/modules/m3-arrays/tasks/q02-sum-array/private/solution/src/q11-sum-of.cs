public static partial class Answers
{
    public static int Q11SumOf(int[] a)
    {
        int s = 0;
        for (int i = 0; i < a.Length; i++)
        {
            s = s + a[i];
        }
        return s;
    }
}
