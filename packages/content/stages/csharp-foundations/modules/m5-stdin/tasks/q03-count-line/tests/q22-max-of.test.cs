public class Q22MaxOfTests
{
    [Theory(DisplayName = "Q22 最大")]
    [InlineData("4\n3 9 4 11\n", "11\n")]
    [InlineData("3\n20 2 15\n", "20\n")]
    [InlineData("1\n7\n", "7\n")]
    public void Q22MaxOf(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q22MaxOf())));
    }
}
