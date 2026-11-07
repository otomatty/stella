public class CheckACloseTests
{
    [Theory(DisplayName = "確認A 差がD以下")]
    [InlineData("3 2\n1 3 6\n", "1\n")]
    [InlineData("3 0\n4 4 4\n", "3\n")]
    [InlineData("1 9\n5\n", "0\n")]
    public void CheckAClose(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckAClose())));
    }
}
