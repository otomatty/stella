public class Q21OddsTests
{
    [Theory(DisplayName = "Q21 行の奇数")]
    [InlineData("2 3\n1 2 3\n4 5 6\n", "2\n1\n")]
    [InlineData("1 1\n2\n", "0\n")]
    public void Q21Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q21Odds())));
    }
}
