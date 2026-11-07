public class Q30OddsTests
{
    [Theory(DisplayName = "Q30 行の奇数")]
    [InlineData("2 2\n0 0\n0 1\n", "0\n1\n")]
    [InlineData("1 1\n0\n", "0\n")]
    public void Q30Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q30Odds())));
    }
}
