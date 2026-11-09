public class Q26CountDigitsTests
{
    [Theory(DisplayName = "Q26 数字の個数")]
    [InlineData("20a6\n", "3\n")]
    [InlineData("abc\n", "0\n")]
    [InlineData("\n", "0\n")]
    public void Q26CountDigits(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q26CountDigits())));
    }
}
