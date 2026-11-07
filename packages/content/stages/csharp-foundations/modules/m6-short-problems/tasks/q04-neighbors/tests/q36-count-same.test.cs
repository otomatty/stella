public class Q36CountSameTests
{
    [Theory(DisplayName = "Q36 隣が同じ")]
    [InlineData("5\n1 1 2 2 2\n", "3\n")]
    [InlineData("2\n1 1\n", "1\n")]
    [InlineData("2\n1 2\n", "0\n")]
    public void Q36CountSame(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q36CountSame())));
    }
}
