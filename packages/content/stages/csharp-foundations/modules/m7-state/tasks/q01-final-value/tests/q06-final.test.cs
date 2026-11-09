public class Q06FinalTests
{
    [Theory(DisplayName = "Q06 最後の値")]
    [InlineData("3 2\n-6\n4\n", "1\n")]
    [InlineData("3 0\n", "3\n")]
    public void Q06Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q06Final())));
    }
}
