public class S04MaxColTests
{
    [Theory(DisplayName = "S04 列を選ぶ")]
    [InlineData("2 3\n1 2 3\n4 3 0\n", "0\n")]
    [InlineData("1 2\n1 9\n", "1\n")]
    public void S04MaxCol(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S04MaxCol())));
    }
}
