public class Q09FinalTests
{
    [Theory(DisplayName = "Q09 最後の値")]
    [InlineData("7 3\n-10\n0\n8\n", "5\n")]
    [InlineData("7 0\n", "7\n")]
    public void Q09Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q09Final())));
    }
}
