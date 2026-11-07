public static partial class Answers
{
    public static void Q07PrintEvenIndex(int[] a)
    {
        for (int i = 0; i < a.Length; i = i + 2)
        {
            Console.WriteLine(a[i]);
        }
    }
}
