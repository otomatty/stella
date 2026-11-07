public static partial class Answers
{
    public static int Q20ProductOf(int[] a)
    {
        int p = 1;
        for (int i = 0; i < a.Length; i++)
        {
            p = p * a[i];
        }
        return p;
    }
}
