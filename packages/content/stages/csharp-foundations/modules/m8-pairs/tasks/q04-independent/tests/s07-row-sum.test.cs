public class S07RowSumTests
{
    [Theory(DisplayName = "S07 合計がK以上")]
    [InlineData("2 3 7\n1 2 3\n4 0 4\n", "1\n")]
    [InlineData("1 3 7\n1 2 3\n", "0\n")]
    public void S07RowSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S07RowSum())));
    }
}
