public class CheckBSmallSumTests
{
    [Theory(DisplayName = "確認B 小さいK個の合計")]
    [InlineData("4 2\n5 1 3 1\n", "2\n")]
    [InlineData("1 1\n-4\n", "-4\n")]
    [InlineData("3 3\n1 2 3\n", "6\n")]
    public void CheckBSmallSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckBSmallSum())));
    }
}
