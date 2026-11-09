public class Q13SameLenTests
{
    [Theory(DisplayName = "Q13 長さが同じ")]
    [InlineData("abc\nabx\n", "Yes\n")]
    [InlineData("abc\nab\n", "No\n")]
    [InlineData("\n\n", "Yes\n")]
    public void Q13SameLen(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q13SameLen())));
    }
}
