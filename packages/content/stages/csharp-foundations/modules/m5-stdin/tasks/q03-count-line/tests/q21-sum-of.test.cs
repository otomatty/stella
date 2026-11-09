public class Q21SumOfTests
{
    [Theory(DisplayName = "Q21 合計")]
    [InlineData("4\n3 9 4 11\n", "27\n")]
    [InlineData("1\n8\n", "8\n")]
    public void Q21SumOf(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q21SumOf())));
    }
}
