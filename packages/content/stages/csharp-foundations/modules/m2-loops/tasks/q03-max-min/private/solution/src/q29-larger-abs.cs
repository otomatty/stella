public static partial class Answers
{
    public static int Q29LargerAbs(int a, int b)
    {
        int absA = a;
        if (absA < 0)
        {
            absA = -absA;
        }

        int absB = b;
        if (absB < 0)
        {
            absB = -absB;
        }

        if (absA >= absB)
        {
            return a;
        }
        else
        {
            return b;
        }
    }
}
