public class CheckACountChangedTests
{
    [Theory(DisplayName = "確認A 隣が変わった組")]
    [InlineData("5\n2 2 4 4 1\n", "2\n")]
    [InlineData("1\n9\n", "0\n")]
    [InlineData("3\n1 1 1\n", "0\n")]
    [InlineData("3\n1 2 1\n", "2\n")]
    public void CheckACountChanged(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckACountChanged())));
    }
}
