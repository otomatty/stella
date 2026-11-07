public class Q18LenContainsTests
{
    [Theory(DisplayName = "Q18 長さで含む")]
    [InlineData("abcd\nab\n", "Yes\n")]
    [InlineData("ab\nabcd\n", "No\n")]
    [InlineData("ab\nab\n", "Yes\n")]
    public void Q18LenContains(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q18LenContains())));
    }
}
