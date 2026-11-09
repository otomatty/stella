public class Q03ImportFinalLogTests
{
    [Theory(DisplayName = "Q03 Importの削除ログを変える")]
    [InlineData("2026 0231", "Check", "Err", "空白を検知しました\n日付が正しくありません\n")]
    [InlineData("2026 0231", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("2023 0229", "Check", "Err", "空白を検知しました\n日付が正しくありません\n")]
    [InlineData("2023 0229", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("2024 0229", "Check", "", "空白を検知しました\n")]
    [InlineData("2024 0229", "Import", "", "空白を削除しました\n")]
    [InlineData("2026 0430", "Check", "", "空白を検知しました\n")]
    [InlineData("2026 0430", "Import", "", "空白を削除しました\n")]
    [InlineData("20260430", "Check", "", "")]
    [InlineData("20260430", "Import", "", "")]
    [InlineData("20260431", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("20260431", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("2026093", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026093", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026 093", "Check", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("2026 093", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("2026 090a", "Check", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("2026 090a", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("2026090a", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026090a", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("　　　", "Check", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("　　　", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("　2026 0903 ", "Check", "", "空白を検知しました\n")]
    [InlineData("　2026 0903 ", "Import", "", "空白を削除しました\n")]
    [InlineData("2026　0903", "Check", "", "空白を検知しました\n")]
    [InlineData("2026　0903", "Import", "", "空白を削除しました\n")]
    [InlineData("2026\t0903", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026\t0903", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("２０２６０９０３", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("２０２６０９０３", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("00000101", "Check", "", "")]
    [InlineData("00000101", "Import", "", "")]
    [InlineData("19000229", "Check", "", "")]
    [InlineData("19000229", "Import", "", "")]
    public void Q03ImportFinalLog(string input, string mode, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q03ImportFinalLog(input, mode));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
