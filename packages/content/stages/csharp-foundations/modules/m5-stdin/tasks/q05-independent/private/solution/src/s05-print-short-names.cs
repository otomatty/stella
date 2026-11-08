// S05 短い名前
// 1行目 N、続く N 行に空白を含まない名前。長さ3以下の名前を入力順に1行ずつ出す。1≦N≦20。
// 例: 3 / tom / alice / yu→tom / yu

public static partial class Answers
{
    public static void S05PrintShortNames()
    {
        int n = int.Parse(Console.ReadLine());
        for (int i = 0; i < n; i++)
        {
            string name = Console.ReadLine();
            if (name.Length <= 3)
            {
                Console.WriteLine(name);
            }
        }
    }
}
