public class S06ColSumTests
{
    [Theory(DisplayName = "S06 列の合計")]
    [InlineData("2 3\n1 2 3\n4 5 6\n", "5\n7\n9\n")]
    [InlineData("1 1\n4\n", "4\n")]
    public void S06ColSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S06ColSum())));
    }
}
