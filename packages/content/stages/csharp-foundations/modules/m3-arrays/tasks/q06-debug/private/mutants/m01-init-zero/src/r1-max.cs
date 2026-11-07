public static partial class Answers
{
    public static int R1Max(int[] a)
    {
        int answer = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] > answer)
            {
                answer = a[i];
            }
        }
        return answer;
    }
}
