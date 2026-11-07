public class Q23OddsTests
{
    [Theory(DisplayName = "Q23 行の奇数")]
    [InlineData("1 1\n1\n", "1\n")]
    [InlineData("1 1\n0\n", "0\n")]
    public void Q23Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q23Odds())));
    }
}
