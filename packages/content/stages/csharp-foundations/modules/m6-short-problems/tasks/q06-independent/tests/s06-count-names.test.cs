public class S06CountNamesTests
{
    [Theory(DisplayName = "S06 登録できる名前")]
    [InlineData("4\nAB\nAb\nABCDE\nXYZ\n", "2\n")]
    [InlineData("1\nA\n", "0\n")]
    [InlineData("1\nABCD\n", "1\n")]
    public void S06CountNames(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S06CountNames())));
    }
}
