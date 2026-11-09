// 仕様B 受付コード
//
// 受付コードを確認する関数CheckReception8を作る。引数はstring inputとstring mode。戻り値は成功が空文字、失敗がErr。inputはnullではない0〜30文字の任意文字列。modeはCheckかImportのみ。空白は半角空白と全角空白。
//
// 有効な受付コードは半角数字8文字で、先頭2文字の部署番号が01〜12。残り6文字は半角数字であればよく、先頭0も許可する。
//
// Checkでは半角・全角空白を全位置から削除する。元に空白があった場合は、成否にかかわらず最初に「空白除去」を1行出す。その後、半角数字8文字でなければ「形式不正」を出してErr。半角数字8文字だが部署番号が範囲外なら「部署不正」を出してErr。有効なら追加ログなしで空文字。
//
// Importでは空白を削除しない。元の入力が半角数字8文字でなければ「形式不正」を出してErr。半角数字8文字だが部署番号が範囲外なら「部署不正」を出してErr。有効ならログなしで空文字。
//
// ログは指定文を記載順に1件1行出す。タブは削除しない。例: 01 123456をCheckで受けると「空白除去」と空文字。同じ入力をImportで受けると「形式不正」とErr。

public static partial class Answers
{
    public static string CheckReception8(string input, string mode)
    {
        bool IsEightDigits(string value)
        {
            if (value.Length != 8)
            {
                return false;
            }
            for (int i = 0; i < value.Length; i++)
            {
                if (value[i] < '0' || value[i] > '9')
                {
                    return false;
                }
            }
            return true;
        }

        string code = input;
        if (mode == "Check")
        {
            code = input.Replace(" ", "").Replace("　", "");
            if (code != input)
            {
                Console.WriteLine("空白除去");
            }
        }

        int department = int.Parse(code.Substring(0, 2));
        if (department < 1 || department > 12)
        {
            Console.WriteLine("部署不正");
            return "Err";
        }
        if (!IsEightDigits(code))
        {
            Console.WriteLine("形式不正");
            return "Err";
        }
        return "";
    }
}
