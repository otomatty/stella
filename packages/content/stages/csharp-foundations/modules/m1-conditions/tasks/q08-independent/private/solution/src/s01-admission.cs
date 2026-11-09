// S01 入館料
// 年齢ageを受け取り、12歳未満は100、65歳以上は150、それ以外は300を整数で返す。0≦age≦120。
// 例: 11→100、12→300、65→150

public static partial class Answers
{
    public static int S01Admission(int age)
    {
        if (age < 12)
        {
            return 100;
        }
        else if (age >= 65)
        {
            return 150;
        }
        else
        {
            return 300;
        }
    }
}
