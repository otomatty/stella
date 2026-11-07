public class Q12PairsTests
{
    [Theory(DisplayName = "Q12 ちょうどK")]
    [InlineData("3 4\n2 2 2\n", "3\n")]
    [InlineData("2 4\n2 2\n", "1\n")]
    public void Q12Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q12Pairs())));
    }
}
