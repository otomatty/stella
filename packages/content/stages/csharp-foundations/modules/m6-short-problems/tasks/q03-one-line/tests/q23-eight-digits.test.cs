public class Q23EightDigitsTests
{
    [Theory(DisplayName = "Q23 8桁の数字")]
    [InlineData("20260903\n", "Yes\n")]
    [InlineData("1234567a\n", "No\n")]
    [InlineData("1234567\n", "No\n")]
    [InlineData("123456789\n", "No\n")]
    [InlineData("\n", "No\n")]
    public void Q23EightDigits(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q23EightDigits())));
    }
}
