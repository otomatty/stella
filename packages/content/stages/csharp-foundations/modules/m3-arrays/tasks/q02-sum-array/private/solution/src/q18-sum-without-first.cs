public static partial class Answers
{
    public static int Q18SumWithoutFirst(int[] a)
    {
        int s = 0;
        for (int i = 1; i < a.Length; i++)
        {
            s = s + a[i];
        }
        return s;
    }
}
