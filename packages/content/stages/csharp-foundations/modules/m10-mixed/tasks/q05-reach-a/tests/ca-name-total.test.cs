public class CaNameTotalTests
{
    [Theory(DisplayName = "到達A 名前の合計")]
    [InlineData("3 2\na 3\nb 4\na 2\na\nc\n", "5\n0\n")]
    [InlineData("0 1\na\n", "0\n")]
    [InlineData("1 2\nA 2\na\nA\n", "0\n2\n")]
    public void CaNameTotal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CaNameTotal())));
    }
}
