public static partial class Answers
{
    public static void Q02PrintReverse(int[] a)
    {
        for (int i = a.Length - 1; i >= 0; i--)
        {
            Console.WriteLine(a[i]);
        }
    }
}
