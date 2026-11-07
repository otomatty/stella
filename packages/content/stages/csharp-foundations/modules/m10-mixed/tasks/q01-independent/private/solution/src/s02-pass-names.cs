// S02 入選者
// 1行目N P、続くN行に名前と点数。P以上の人の名前を入力順に1行ずつ表示する。誰もいなければnoneを1行表示する。同じ名前の別行も別の人。 1≦N≦20、Pと点数は0〜100。名前は半角英字1〜10文字。
// 例: 3 70 / aki 70 / mei 60 / ren 80 → aki / ren

public static partial class Answers
{
    public static void S02PassNames()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int p = int.Parse(header[1]);
        int found = 0;
        for (int i = 0; i < n; i++)
        {
            string[] row = Console.ReadLine().Split();
            if (int.Parse(row[1]) >= p)
            {
                Console.WriteLine(row[0]);
                found = 1;
            }
        }
        if (found == 0) Console.WriteLine("none");
    }
}
