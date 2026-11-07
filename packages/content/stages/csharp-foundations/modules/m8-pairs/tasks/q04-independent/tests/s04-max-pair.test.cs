public class S04MaxPairTests
{
    [Theory(DisplayName = "S04 最大の合計")]
    [InlineData("4 7\n2 3 4 8\n", "7\n")]
    [InlineData("2 7\n8 9\n", "-1\n")]
    [InlineData("1 10\n1\n", "-1\n")]
    public void S04MaxPair(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S04MaxPair())));
    }
}
