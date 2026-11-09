public class Q17PairsTests
{
    [Theory(DisplayName = "Q17 ちょうどK")]
    [InlineData("3 9\n1 2 3\n", "0\n")]
    [InlineData("2 9\n1 2\n", "0\n")]
    public void Q17Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q17Pairs())));
    }
}
