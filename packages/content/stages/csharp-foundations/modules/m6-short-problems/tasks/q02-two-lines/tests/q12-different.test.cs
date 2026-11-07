public class Q12DifferentTests
{
    [Theory(DisplayName = "Q12 不一致")]
    [InlineData("abc\nabc\n", "No\n")]
    [InlineData("abc\nab\n", "Yes\n")]
    [InlineData("\n\n", "No\n")]
    public void Q12Different(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q12Different())));
    }
}
