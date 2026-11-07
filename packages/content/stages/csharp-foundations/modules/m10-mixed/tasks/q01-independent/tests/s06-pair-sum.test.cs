public class S06PairSumTests
{
    [Theory(DisplayName = "S06 二品の購入")]
    [InlineData("4 10\n6 3 5 8\n", "9\n")]
    [InlineData("1 10\n9\n", "-1\n")]
    [InlineData("2 10\n20 20\n", "-1\n")]
    public void S06PairSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S06PairSum())));
    }
}
