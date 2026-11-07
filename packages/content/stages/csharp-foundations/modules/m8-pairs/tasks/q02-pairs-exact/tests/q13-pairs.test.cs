public class Q13PairsTests
{
    [Theory(DisplayName = "Q13 ちょうどK")]
    [InlineData("1 10\n5\n", "0\n")]
    [InlineData("1 0\n0\n", "0\n")]
    public void Q13Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q13Pairs())));
    }
}
