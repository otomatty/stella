public static partial class Answers
{
    public static void S10PrintUpDown(int[] a)
    {
        int up = 0;
        int down = 0;
        for (int i = 0; i < a.Length - 1; i++)
        {
            if (a[i + 1] > a[i])
            {
                up = up + 1;
            }
            else if (a[i + 1] < a[i])
            {
                down = down + 1;
            }
        }
        Console.WriteLine(up);
        Console.WriteLine(down);
    }
}
