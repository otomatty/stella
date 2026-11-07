public class Q35CountDownTests
{
    [Theory(DisplayName = "Q35 減少")]
    [InlineData("4\n3 10 6 20\n", "1\n")]
    [InlineData("2\n10 3\n", "1\n")]
    [InlineData("2\n3 10\n", "0\n")]
    public void Q35CountDown(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q35CountDown())));
    }
}
