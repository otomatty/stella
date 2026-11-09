public class Q04CheckTime6Tests
{
    [Theory(DisplayName = "Q04 6桁の時刻を検証する")]
    [InlineData("000000", "Check", "", "")]
    [InlineData("000000", "Import", "", "")]
    [InlineData("235959", "Check", "", "")]
    [InlineData("235959", "Import", "", "")]
    [InlineData("240000", "Check", "Err", "時刻が正しくありません\n")]
    [InlineData("240000", "Import", "Err", "時刻が正しくありません\n")]
    [InlineData("126000", "Check", "Err", "時刻が正しくありません\n")]
    [InlineData("126000", "Import", "Err", "時刻が正しくありません\n")]
    [InlineData("125960", "Check", "Err", "時刻が正しくありません\n")]
    [InlineData("125960", "Import", "Err", "時刻が正しくありません\n")]
    [InlineData("12 6000", "Check", "Err", "空白を検知しました\n時刻が正しくありません\n")]
    [InlineData("12 6000", "Import", "Err", "空白を削除しました\n時刻が正しくありません\n")]
    [InlineData("", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("12 3456", "Check", "", "空白を検知しました\n")]
    [InlineData("12 3456", "Import", "", "空白を削除しました\n")]
    [InlineData("12　3456", "Import", "", "空白を削除しました\n")]
    [InlineData("　12 3456 ", "Check", "", "空白を検知しました\n")]
    [InlineData("12345", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("1234567", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("12 345", "Check", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("12 345", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("12345a", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("12 345a", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("１２３４５６", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("12\t456", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("　　　", "Check", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("　　　", "Import", "Err", "入力値が正しくありません\n")]
    public void Q04CheckTime6(string input, string mode, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q04CheckTime6(input, mode));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
