public class S04FirstLastTests
{
    [Theory(DisplayName = "S04 最初と最後")]
    [InlineData("3\n8 1 5\n", "DOWN\n")]
    [InlineData("2\n1 9\n", "UP\n")]
    [InlineData("2\n4 4\n", "SAME\n")]
    public void S04FirstLast(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S04FirstLast())));
    }
}
