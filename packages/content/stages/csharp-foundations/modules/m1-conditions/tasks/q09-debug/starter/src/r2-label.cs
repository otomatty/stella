// R2
// 2と3の両方で割り切れるならboth、2だけtwo、3だけthree、それ以外noneを返す。1〜100。

public static partial class Answers
{
    public static string R2Label(int n)
    {
        string result = "none";
        if (n % 2 == 0) result = "two";
        if (n % 3 == 0) result = "three";
        return result;
    }
}
