public class S10CheckCodesTests
{
    [Theory(DisplayName = "S10 申請の確認")]
    [InlineData("3\n0123\n4567\n89a0\n", "NG\n")]
    [InlineData("2\n0123\n4567\n", "OK\n")]
    [InlineData("1\n123\n", "NG\n")]
    public void S10CheckCodes(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S10CheckCodes())));
    }
}
