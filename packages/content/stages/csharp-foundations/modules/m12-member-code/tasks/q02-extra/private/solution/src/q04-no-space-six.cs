// Q04 空白を受け付けない6桁版
//
// 文字列を受け取る6桁版を新しく書く。この版では空白は削除しない。空白が1個でもあれば「空白不可」を出してErr。それ以外で半角数字6文字でなければ「形式不正」を出してErr。成功はログなしで空文字。
//
// 入力はnullではない任意の文字列。半角・全角空白を対象とする。
// 補助の関数を使う場合は、この問題のメソッドの中に書く。

public static partial class Answers
{
    public static string Q04NoSpaceSix(string strInput)
    {
        bool IsDigitN(string s, int n)
        {
            if (s.Length != n)
            {
                return false;
            }
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] < '0' || s[i] > '9')
                {
                    return false;
                }
            }
            return true;
        }

        if (strInput.Contains(" ") || strInput.Contains("　"))
        {
            Console.WriteLine("空白不可");
            return "Err";
        }
        if (!IsDigitN(strInput, 6))
        {
            Console.WriteLine("形式不正");
            return "Err";
        }
        return "";
    }
}
