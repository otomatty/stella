public class Q24ContainsATests
{
    [Theory(DisplayName = "Q24 文字 a")]
    [InlineData("banana\n", "Yes\n")]
    [InlineData("xyz\n", "No\n")]
    [InlineData("\n", "No\n")]
    public void Q24ContainsA(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q24ContainsA())));
    }
}
