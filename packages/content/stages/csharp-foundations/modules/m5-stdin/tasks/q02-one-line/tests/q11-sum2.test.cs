public class Q11Sum2Tests
{
    [Theory(DisplayName = "Q11 2つの合計")]
    [InlineData("3 10\n", "13\n")]
    [InlineData("0 0\n", "0\n")]
    [InlineData("-1 4\n", "3\n")]
    public void Q11Sum2(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q11Sum2())));
    }
}
