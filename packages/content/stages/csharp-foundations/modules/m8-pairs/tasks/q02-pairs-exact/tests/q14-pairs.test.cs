public class Q14PairsTests
{
    [Theory(DisplayName = "Q14 ちょうどK")]
    [InlineData("2 0\n0 0\n", "1\n")]
    [InlineData("2 0\n0 1\n", "0\n")]
    public void Q14Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q14Pairs())));
    }
}
