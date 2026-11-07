public class Q11PairsTests
{
    [Theory(DisplayName = "Q11 ちょうどK")]
    [InlineData("4 5\n1 2 3 4\n", "2\n")]
    [InlineData("2 5\n1 4\n", "1\n")]
    public void Q11Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q11Pairs())));
    }
}
