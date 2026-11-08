public class Q17Sum3Tests
{
    [Theory(DisplayName = "Q17 3つの合計")]
    [InlineData("1 2 3\n", "6\n")]
    [InlineData("0 0 0\n", "0\n")]
    [InlineData("-1 4 1\n", "4\n")]
    public void Q17Sum3(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q17Sum3())));
    }
}
