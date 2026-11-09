// R2
// 2と3の両方で割り切れるならboth、2だけtwo、3だけthree、それ以外noneを返す。1〜100。

public static partial class Answers
{
    public static string R2Label(int n)
    {
        if (n % 2 == 0 && n % 3 == 0)
        {
            return "both";
        }
        else if (n % 2 == 0)
        {
            return "two";
        }
        else if (n % 3 == 0)
        {
            return "three";
        }
        else
        {
            return "none";
        }
    }
}
