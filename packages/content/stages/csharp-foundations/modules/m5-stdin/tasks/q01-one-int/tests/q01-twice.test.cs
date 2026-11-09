public class Q01TwiceTests
{
    [Theory(DisplayName = "Q01 2倍")]
    [InlineData("7\n", "14\n")]
    [InlineData("0\n", "0\n")]
    [InlineData("-3\n", "-6\n")]
    public void Q01Twice(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q01Twice())));
    }
}
