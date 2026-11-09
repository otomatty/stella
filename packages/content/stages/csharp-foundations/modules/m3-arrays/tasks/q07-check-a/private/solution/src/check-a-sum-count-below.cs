public static partial class Answers
{
    public static void CheckASumCountBelow(int[] a, int k)
    {
        int s = 0;
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] < k)
            {
                s = s + a[i];
                c = c + 1;
            }
        }
        Console.WriteLine(s);
        Console.WriteLine(c);
    }
}
