public static partial class Answers
{
    public static void Q04PrintOdds(int[] a)
    {
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] % 2 != 0)
            {
                Console.WriteLine(a[i]);
            }
        }
    }
}
