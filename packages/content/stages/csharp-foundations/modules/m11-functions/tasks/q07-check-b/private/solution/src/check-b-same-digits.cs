// 確認B 同じ長さの数字
// 関数の問題は戻り値を確認する。null はない。指定のない配列の長さは 0〜20、整数は -100〜100。
// 空でなくすべて半角数字なら true を返す Digits を作る。次に二つの文字列 s, t がどちらも Digits を満たし、長さも等しければ true を返す関数から呼ぶ。
// 例: 01,23→true

public static partial class Answers
{
    public static bool CheckBSameDigits(string s, string t)
    {
        static bool Digits(string text)
        {
            if (text.Length == 0) return false;
            for (int i = 0; i < text.Length; i++)
            {
                if (text[i] < '0' || text[i] > '9') return false;
            }
            return true;
        }
        return Digits(s) && Digits(t) && s.Length == t.Length;
    }
}
