public class Q04FinalTests
{
    [Theory(DisplayName = "Q04 最後の値")]
    [InlineData("5 2\n0\n0\n", "5\n")]
    [InlineData("5 0\n", "5\n")]
    public void Q04Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q04Final())));
    }
}
