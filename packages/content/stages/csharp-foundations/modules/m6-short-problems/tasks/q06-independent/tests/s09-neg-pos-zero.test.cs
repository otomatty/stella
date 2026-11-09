public class S09NegPosZeroTests
{
    [Theory(DisplayName = "S09 集計の対象")]
    [InlineData("5\n-2 0 3 -1 4\n", "2\n7\n1\n")]
    [InlineData("1\n0\n", "0\n0\n1\n")]
    public void S09NegPosZero(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S09NegPosZero())));
    }
}
