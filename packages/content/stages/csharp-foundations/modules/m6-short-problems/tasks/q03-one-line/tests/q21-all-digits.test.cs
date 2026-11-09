public class Q21AllDigitsTests
{
    [Theory(DisplayName = "Q21 全部数字")]
    [InlineData("123\n", "Yes\n")]
    [InlineData("12a\n", "No\n")]
    [InlineData("0\n", "Yes\n")]
    [InlineData("\n", "No\n")]
    public void Q21AllDigits(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q21AllDigits())));
    }
}
