public class R2SumPartsTests
{
    [Theory(DisplayName = "R2 1行の合計")]
    [InlineData("3\n1 2 3\n", "6\n")]
    [InlineData("1\n8\n", "8\n")]
    [InlineData("3\n0 0 0\n", "0\n")]
    [InlineData("2\n-1 4\n", "3\n")]
    public void R2SumParts(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.R2SumParts())));
    }
}
