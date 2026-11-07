// R1
// 12歳未満は100、それ以外は200を返す。0〜120歳を受け取る。

public static partial class Answers
{
    public static int R1Fee(int age)
    {
        if (age <= 12) return 100;
        return 200;
    }
}
