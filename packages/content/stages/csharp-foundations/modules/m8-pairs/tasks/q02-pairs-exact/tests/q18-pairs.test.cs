public class Q18PairsTests
{
    [Theory(DisplayName = "Q18 ちょうどK")]
    [InlineData("3 5\n5 5 0\n", "2\n")]
    [InlineData("2 5\n5 0\n", "1\n")]
    public void Q18Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q18Pairs())));
    }
}
