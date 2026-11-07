public class Q26SumEvensTests
{
    [Theory(DisplayName = "Q26 偶数の合計")]
    [InlineData("5\n3 9 4 11 6\n", "10\n")]
    [InlineData("1\n8\n", "8\n")]
    public void Q26SumEvens(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q26SumEvens())));
    }
}
