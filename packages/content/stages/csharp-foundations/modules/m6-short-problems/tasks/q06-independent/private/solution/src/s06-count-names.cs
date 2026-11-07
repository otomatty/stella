// S06 登録できる名前
// 1行目 N、続く N 行の文字列。長さ 2〜4 かつすべて半角大文字のものの件数を表示する。
// 例: 4 / AB / Ab / ABCDE / XYZ→2

public static partial class Answers
{
    public static void S06CountNames()
    {
        int n = int.Parse(Console.ReadLine());
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            string name = Console.ReadLine();
            if (name.Length < 2 || name.Length > 4)
            {
                continue;
            }
            bool upper = true;
            for (int j = 0; j < name.Length; j++)
            {
                if (name[j] < 'A' || name[j] > 'Z')
                {
                    upper = false;
                }
            }
            if (upper)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
