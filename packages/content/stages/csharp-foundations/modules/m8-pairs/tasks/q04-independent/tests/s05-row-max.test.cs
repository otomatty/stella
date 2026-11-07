public class S05RowMaxTests
{
    [Theory(DisplayName = "S05 行の最大")]
    [InlineData("2 3\n-5 -2 -8\n4 4 1\n", "-2\n4\n")]
    [InlineData("1 1\n-3\n", "-3\n")]
    public void S05RowMax(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S05RowMax())));
    }
}
