public class Q14SLongerTests
{
    [Theory(DisplayName = "Q14 S のほうが長い")]
    [InlineData("abcd\nab\n", "Yes\n")]
    [InlineData("ab\nabcd\n", "No\n")]
    [InlineData("ab\nab\n", "No\n")]
    public void Q14SLonger(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q14SLonger())));
    }
}
