public class R1SumLinesTests
{
    [Theory(DisplayName = "R1 行の合計")]
    [InlineData("0\n", "0\n")]
    [InlineData("1\n5\n", "5\n")]
    [InlineData("2\n1\n2\n", "3\n")]
    [InlineData("5\n1\n2\n3\n4\n5\n", "15\n")]
    public void R1SumLines(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.R1SumLines())));
    }
}
