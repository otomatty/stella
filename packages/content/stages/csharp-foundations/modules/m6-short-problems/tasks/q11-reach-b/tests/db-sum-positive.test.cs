public class DbSumPositiveTests
{
    [Theory(DisplayName = "到達B 正の合計")]
    [InlineData("4\n-2 0 3 4\n", "7\n")]
    [InlineData("1\n-1\n", "0\n")]
    [InlineData("1\n5\n", "5\n")]
    public void DbSumPositive(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.DbSumPositive())));
    }
}
