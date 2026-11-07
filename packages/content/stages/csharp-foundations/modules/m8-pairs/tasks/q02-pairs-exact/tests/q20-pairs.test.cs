public class Q20PairsTests
{
    [Theory(DisplayName = "Q20 ちょうどK")]
    [InlineData("4 14\n7 7 7 7\n", "6\n")]
    [InlineData("2 14\n7 7\n", "1\n")]
    public void Q20Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q20Pairs())));
    }
}
