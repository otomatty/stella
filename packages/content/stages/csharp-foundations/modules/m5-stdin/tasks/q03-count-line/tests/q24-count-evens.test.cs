public class Q24CountEvensTests
{
    [Theory(DisplayName = "Q24 偶数の個数")]
    [InlineData("5\n3 9 4 11 6\n", "2\n")]
    [InlineData("3\n1 3 5\n", "0\n")]
    [InlineData("1\n4\n", "1\n")]
    public void Q24CountEvens(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q24CountEvens())));
    }
}
