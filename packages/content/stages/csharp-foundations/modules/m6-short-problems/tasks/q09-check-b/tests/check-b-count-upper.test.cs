public class CheckBCountUpperTests
{
    [Theory(DisplayName = "確認B 大文字を含む件数")]
    [InlineData("3\naB\nAB\nxyz\n", "2\n")]
    [InlineData("2\nA\n\n", "1\n")]
    [InlineData("1\nabc\n", "0\n")]
    public void CheckBCountUpper(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckBCountUpper())));
    }
}
