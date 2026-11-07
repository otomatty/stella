public class Q32MaxNeighborSumTests
{
    [Theory(DisplayName = "Q32 隣の和の最大")]
    [InlineData("4\n3 10 6 20\n", "26\n")]
    [InlineData("2\n3 10\n", "13\n")]
    public void Q32MaxNeighborSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q32MaxNeighborSum())));
    }
}
