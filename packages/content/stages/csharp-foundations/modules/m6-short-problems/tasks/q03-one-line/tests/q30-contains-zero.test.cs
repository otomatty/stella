public class Q30ContainsZeroTests
{
    [Theory(DisplayName = "Q30 0 を含む")]
    [InlineData("2026\n", "Yes\n")]
    [InlineData("111\n", "No\n")]
    [InlineData("\n", "No\n")]
    public void Q30ContainsZero(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q30ContainsZero())));
    }
}
