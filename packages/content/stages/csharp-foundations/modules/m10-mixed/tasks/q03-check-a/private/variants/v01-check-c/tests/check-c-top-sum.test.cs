public class CheckCTopSumTests
{
    [Theory(DisplayName = "確認C 上位の合計")]
    [InlineData("4 2\n90 80 80 50\n", "250\n")]
    [InlineData("3 1\n5 5 1\n", "10\n")]
    [InlineData("1 1\n0\n", "0\n")]
    public void CheckCTopSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckCTopSum())));
    }
}
