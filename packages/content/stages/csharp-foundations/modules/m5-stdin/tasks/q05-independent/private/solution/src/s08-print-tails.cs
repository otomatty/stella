// S08 末尾を集める
// 1行目 N、続く N 行に1文字以上の文字列。それぞれの末尾を1行ずつ出す。1≦N≦20。
// 例: 2 / abc / XY→c / Y

public static partial class Answers
{
    public static void S08PrintTails()
    {
        int n = int.Parse(Console.ReadLine());
        for (int i = 0; i < n; i++)
        {
            string value = Console.ReadLine();
            Console.WriteLine(value[value.Length - 1]);
        }
    }
}
