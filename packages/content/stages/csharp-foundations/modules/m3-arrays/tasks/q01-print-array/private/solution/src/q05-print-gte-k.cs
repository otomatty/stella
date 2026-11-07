public static partial class Answers
{
    public static void Q05PrintGteK(int[] a, int k)
    {
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= k)
            {
                Console.WriteLine(a[i]);
            }
        }
    }
}
