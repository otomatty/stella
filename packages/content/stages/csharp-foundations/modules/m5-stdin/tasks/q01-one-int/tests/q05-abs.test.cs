public class Q05AbsTests
{
    [Theory(DisplayName = "Q05 絶対値")]
    [InlineData("-7\n", "7\n")]
    [InlineData("8\n", "8\n")]
    [InlineData("0\n", "0\n")]
    public void Q05Abs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q05Abs())));
    }
}
