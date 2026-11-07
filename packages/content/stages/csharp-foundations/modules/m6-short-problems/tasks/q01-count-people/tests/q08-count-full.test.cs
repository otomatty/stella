public class Q08CountFullTests
{
    [Theory(DisplayName = "Q08 満点")]
    [InlineData("5\n50 60 80 59 100\n", "1\n")]
    [InlineData("1\n99\n", "0\n")]
    public void Q08CountFull(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q08CountFull())));
    }
}
