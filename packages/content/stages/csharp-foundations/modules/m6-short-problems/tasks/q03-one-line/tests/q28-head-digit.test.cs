public class Q28HeadDigitTests
{
    [Theory(DisplayName = "Q28 先頭が数字")]
    [InlineData("1ab\n", "Yes\n")]
    [InlineData("a12\n", "No\n")]
    [InlineData("\n", "No\n")]
    public void Q28HeadDigit(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q28HeadDigit())));
    }
}
