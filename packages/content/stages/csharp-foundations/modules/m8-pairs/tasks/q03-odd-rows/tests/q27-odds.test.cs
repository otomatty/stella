public class Q27OddsTests
{
    [Theory(DisplayName = "Q27 行の奇数")]
    [InlineData("3 1\n1\n2\n3\n", "1\n0\n1\n")]
    [InlineData("1 1\n0\n", "0\n")]
    public void Q27Odds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q27Odds())));
    }
}
