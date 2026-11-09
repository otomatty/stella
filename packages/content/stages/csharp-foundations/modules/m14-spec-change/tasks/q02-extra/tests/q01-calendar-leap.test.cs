public class Q01CalendarLeapTests
{
    [Theory(DisplayName = "Q01 暦の規則へ変更")]
    [InlineData("19000228", "Check", "", "")]
    [InlineData("1900 0228", "Import", "", "空白を削除しました\n")]
    [InlineData("19000229", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("1900 0229", "Import", "Err", "空白を削除しました\n日付が正しくありません\n")]
    [InlineData("19000301", "Check", "", "")]
    [InlineData("1900 0301", "Import", "", "空白を削除しました\n")]
    [InlineData("20000228", "Check", "", "")]
    [InlineData("2000 0228", "Import", "", "空白を削除しました\n")]
    [InlineData("20000229", "Check", "", "")]
    [InlineData("2000 0229", "Import", "", "空白を削除しました\n")]
    [InlineData("20000301", "Check", "", "")]
    [InlineData("2000 0301", "Import", "", "空白を削除しました\n")]
    [InlineData("20240228", "Check", "", "")]
    [InlineData("2024 0228", "Import", "", "空白を削除しました\n")]
    [InlineData("20240229", "Check", "", "")]
    [InlineData("2024 0229", "Import", "", "空白を削除しました\n")]
    [InlineData("20240301", "Check", "", "")]
    [InlineData("2024 0301", "Import", "", "空白を削除しました\n")]
    [InlineData("21000228", "Check", "", "")]
    [InlineData("2100 0228", "Import", "", "空白を削除しました\n")]
    [InlineData("21000229", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("2100 0229", "Import", "Err", "空白を削除しました\n日付が正しくありません\n")]
    [InlineData("21000301", "Check", "", "")]
    [InlineData("2100 0301", "Import", "", "空白を削除しました\n")]
    [InlineData("24000228", "Check", "", "")]
    [InlineData("2400 0228", "Import", "", "空白を削除しました\n")]
    [InlineData("24000229", "Check", "", "")]
    [InlineData("2400 0229", "Import", "", "空白を削除しました\n")]
    [InlineData("24000301", "Check", "", "")]
    [InlineData("2400 0301", "Import", "", "空白を削除しました\n")]
    public void Q01CalendarLeap(string input, string mode, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q01CalendarLeap(input, mode));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
