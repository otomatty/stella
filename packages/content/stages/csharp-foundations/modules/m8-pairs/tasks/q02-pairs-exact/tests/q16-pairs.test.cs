public class Q16PairsTests
{
    [Theory(DisplayName = "Q16 ちょうどK")]
    [InlineData("3 12\n3 6 9\n", "1\n")]
    [InlineData("2 12\n3 9\n", "1\n")]
    public void Q16Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q16Pairs())));
    }
}
