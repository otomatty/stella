public class CaPairsOverTests
{
    [Theory(DisplayName = "到達A 大きい組")]
    [InlineData("4 6\n1 3 4 5\n", "3\n")]
    [InlineData("3 4\n2 2 2\n", "0\n")]
    [InlineData("1 0\n9\n", "0\n")]
    public void CaPairsOver(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CaPairsOver())));
    }
}
