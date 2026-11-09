public class CheckCAbsDiffTests
{
    [Theory(DisplayName = "確認C 差の絶対値")]
    [InlineData("2\n2 7\n8 1\n", "5\n7\n")]
    [InlineData("0\n", "")]
    [InlineData("1\n-2 -5\n", "3\n")]
    [InlineData("1\n4 4\n", "0\n")]
    public void CheckCAbsDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckCAbsDiff())));
    }
}
