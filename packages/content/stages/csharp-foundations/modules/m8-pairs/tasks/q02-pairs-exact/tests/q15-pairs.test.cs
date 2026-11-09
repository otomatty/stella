public class Q15PairsTests
{
    [Theory(DisplayName = "Q15 ちょうどK")]
    [InlineData("4 5\n1 4 1 4\n", "4\n")]
    [InlineData("2 5\n1 4\n", "1\n")]
    public void Q15Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q15Pairs())));
    }
}
